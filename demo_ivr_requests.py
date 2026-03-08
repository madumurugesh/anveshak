"""
Demo IVR Webhook Requests → Ingestion Service
===============================================
Sends simulated IVR callback payloads (as if coming from Twilio/IVR system)
to the Anveshak Ingestion Service webhook endpoint.

Usage:
    python demo_ivr_requests.py                          # default: http://localhost:8000
    python demo_ivr_requests.py --url http://1.2.3.4:8000
    python demo_ivr_requests.py --url http://localhost:8000 --count 5
"""

import argparse
import json
import random
import sys
import time
import requests

# ── Realistic beneficiary payloads from seed data ────────────────
# Each entry mirrors a real beneficiary row in the DB.
DEMO_PAYLOADS = [
    # PDS beneficiaries
    {"phone_hash": "hash_pds_001", "scheme_id": "PDS", "pincode": "603001", "response_value": 1},  # YES
    {"phone_hash": "hash_pds_002", "scheme_id": "PDS", "pincode": "603001", "response_value": 1},  # YES
    {"phone_hash": "hash_pds_003", "scheme_id": "PDS", "pincode": "603002", "response_value": 2},  # NO
    {"phone_hash": "hash_pds_004", "scheme_id": "PDS", "pincode": "603002", "response_value": 2},  # NO
    {"phone_hash": "hash_pds_005", "scheme_id": "PDS", "pincode": "605001", "response_value": 1},  # YES
    {"phone_hash": "hash_pds_006", "scheme_id": "PDS", "pincode": "605001", "response_value": 2},  # NO
    {"phone_hash": "hash_pds_007", "scheme_id": "PDS", "pincode": "605002", "response_value": 1},  # YES
    {"phone_hash": "hash_pds_008", "scheme_id": "PDS", "pincode": "605002", "response_value": 2},  # NO
    {"phone_hash": "hash_pds_009", "scheme_id": "PDS", "pincode": "605003", "response_value": 1},  # YES

    # PM_KISAN beneficiaries
    {"phone_hash": "hash_pmk_001", "scheme_id": "PM_KISAN", "pincode": "603003", "response_value": 2},  # NO
    {"phone_hash": "hash_pmk_002", "scheme_id": "PM_KISAN", "pincode": "603003", "response_value": 2},  # NO
    {"phone_hash": "hash_pmk_003", "scheme_id": "PM_KISAN", "pincode": "603004", "response_value": 1},  # YES
    {"phone_hash": "hash_pmk_004", "scheme_id": "PM_KISAN", "pincode": "603004", "response_value": 1},  # YES
    {"phone_hash": "hash_pmk_005", "scheme_id": "PM_KISAN", "pincode": "605004", "response_value": 2},  # NO
    {"phone_hash": "hash_pmk_006", "scheme_id": "PM_KISAN", "pincode": "605004", "response_value": 1},  # YES
    {"phone_hash": "hash_pmk_007", "scheme_id": "PM_KISAN", "pincode": "605005", "response_value": 2},  # NO
    {"phone_hash": "hash_pmk_008", "scheme_id": "PM_KISAN", "pincode": "605005", "response_value": 1},  # YES
    {"phone_hash": "hash_pmk_009", "scheme_id": "PM_KISAN", "pincode": "605006", "response_value": 2},  # NO

    # OLD_AGE_PENSION beneficiaries
    {"phone_hash": "hash_oap_001", "scheme_id": "OLD_AGE_PENSION", "pincode": "603005", "response_value": 1},  # YES
    {"phone_hash": "hash_oap_002", "scheme_id": "OLD_AGE_PENSION", "pincode": "603005", "response_value": 2},  # NO
    {"phone_hash": "hash_oap_003", "scheme_id": "OLD_AGE_PENSION", "pincode": "603006", "response_value": 1},  # YES
    {"phone_hash": "hash_oap_004", "scheme_id": "OLD_AGE_PENSION", "pincode": "603006", "response_value": 2},  # NO
    {"phone_hash": "hash_oap_005", "scheme_id": "OLD_AGE_PENSION", "pincode": "605007", "response_value": 1},  # YES
    {"phone_hash": "hash_oap_006", "scheme_id": "OLD_AGE_PENSION", "pincode": "605007", "response_value": 2},  # NO
    {"phone_hash": "hash_oap_007", "scheme_id": "OLD_AGE_PENSION", "pincode": "605008", "response_value": 1},  # YES
    {"phone_hash": "hash_oap_008", "scheme_id": "OLD_AGE_PENSION", "pincode": "605008", "response_value": 2},  # NO

    # LPG beneficiaries
    {"phone_hash": "hash_lpg_001", "scheme_id": "LPG", "pincode": "603007", "response_value": 1},  # YES
    {"phone_hash": "hash_lpg_002", "scheme_id": "LPG", "pincode": "603007", "response_value": 2},  # NO
    {"phone_hash": "hash_lpg_003", "scheme_id": "LPG", "pincode": "603008", "response_value": 1},  # YES
    {"phone_hash": "hash_lpg_004", "scheme_id": "LPG", "pincode": "603008", "response_value": 2},  # NO
    {"phone_hash": "hash_lpg_005", "scheme_id": "LPG", "pincode": "605010", "response_value": 1},  # YES
    {"phone_hash": "hash_lpg_006", "scheme_id": "LPG", "pincode": "605010", "response_value": 2},  # NO
    {"phone_hash": "hash_lpg_007", "scheme_id": "LPG", "pincode": "605011", "response_value": 1},  # YES
    {"phone_hash": "hash_lpg_008", "scheme_id": "LPG", "pincode": "605011", "response_value": 2},  # NO
    {"phone_hash": "hash_lpg_009", "scheme_id": "LPG", "pincode": "605012", "response_value": 1},  # YES
]

RESPONSE_LABEL = {1: "YES (received benefit)", 2: "NO (not received)"}
SCHEME_LABELS = {
    "PDS": "Public Distribution System",
    "PM_KISAN": "PM-KISAN",
    "OLD_AGE_PENSION": "Old Age Pension",
    "LPG": "LPG Subsidy",
}


def send_request(base_url: str, payload: dict, index: int) -> None:
    url = f"{base_url.rstrip('/')}/api/ivr/webhook"
    scheme = SCHEME_LABELS.get(payload["scheme_id"], payload["scheme_id"])
    response_label = RESPONSE_LABEL[payload["response_value"]]

    print(f"\n[{index}] Sending IVR response: {payload['phone_hash']} | {scheme} | {response_label}")
    print(f"    POST {url}")
    print(f"    Body: {json.dumps(payload)}")

    try:
        resp = requests.post(url, json=payload, timeout=10)
        body = resp.json()
        status_code = resp.status_code

        if status_code == 200:
            seq = body.get("kinesis_sequence", "N/A")
            print(f"    ✅ {status_code} ACCEPTED — {body['message']} (seq: {seq})")
        elif status_code == 409:
            print(f"    ⚠️  {status_code} DUPLICATE — {body.get('detail', body)}")
        elif status_code == 403:
            print(f"    ❌ {status_code} REJECTED — {body.get('detail', body)}")
        else:
            print(f"    ❌ {status_code} — {body}")

    except requests.ConnectionError:
        print(f"    ❌ Connection refused — is the ingestion service running at {base_url}?")
    except requests.Timeout:
        print(f"    ❌ Request timed out after 10s")
    except Exception as e:
        print(f"    ❌ Error: {e}")


def main():
    parser = argparse.ArgumentParser(description="Send demo IVR requests to the Ingestion Service")
    parser.add_argument("--url", default="http://localhost:8000", help="Base URL of the ingestion service (default: http://localhost:8000)")
    parser.add_argument("--count", type=int, default=0, help="Number of random requests to send (0 = send all)")
    parser.add_argument("--delay", type=float, default=0.3, help="Delay between requests in seconds (default: 0.3)")
    parser.add_argument("--health", action="store_true", help="Only check health endpoint")
    args = parser.parse_args()

    base_url = args.url

    # ── Health check ─────────────────────────────────────────
    print(f"🔍 Checking ingestion service health at {base_url}/health ...")
    try:
        r = requests.get(f"{base_url.rstrip('/')}/health", timeout=5)
        print(f"   Health: {r.status_code} — {r.json()}")
    except requests.ConnectionError:
        print(f"   ❌ Cannot connect to {base_url}. Is the service running?")
        sys.exit(1)
    except Exception as e:
        print(f"   ❌ Health check failed: {e}")
        sys.exit(1)

    if args.health:
        return

    # ── Pick payloads ────────────────────────────────────────
    if args.count > 0:
        payloads = random.sample(DEMO_PAYLOADS, min(args.count, len(DEMO_PAYLOADS)))
    else:
        payloads = DEMO_PAYLOADS

    print(f"\n📡 Sending {len(payloads)} IVR webhook requests to {base_url}/api/ivr/webhook\n")
    print("=" * 72)

    accepted = duplicates = rejected = errors = 0

    for i, payload in enumerate(payloads, 1):
        url = f"{base_url.rstrip('/')}/api/ivr/webhook"
        scheme = SCHEME_LABELS.get(payload["scheme_id"], payload["scheme_id"])
        response_label = RESPONSE_LABEL[payload["response_value"]]

        print(f"\n[{i}/{len(payloads)}] {payload['phone_hash']} | {scheme} | {response_label}")
        print(f"         POST {url}")

        try:
            resp = requests.post(url, json=payload, timeout=10)
            body = resp.json()
            sc = resp.status_code

            if sc == 200:
                seq = body.get("kinesis_sequence", "N/A")
                print(f"         ✅ ACCEPTED — {body['message']} (seq: {seq})")
                accepted += 1
            elif sc == 409:
                print(f"         ⚠️  DUPLICATE — {body.get('detail', body)}")
                duplicates += 1
            elif sc == 403:
                print(f"         ❌ REJECTED — {body.get('detail', body)}")
                rejected += 1
            else:
                print(f"         ❌ {sc} — {body}")
                errors += 1
        except requests.ConnectionError:
            print(f"         ❌ Connection refused")
            errors += 1
        except Exception as e:
            print(f"         ❌ {e}")
            errors += 1

        if i < len(payloads):
            time.sleep(args.delay)

    # ── Summary ──────────────────────────────────────────────
    print("\n" + "=" * 72)
    print(f"📊 Summary: {len(payloads)} requests sent")
    print(f"   ✅ Accepted:   {accepted}")
    print(f"   ⚠️  Duplicates: {duplicates}")
    print(f"   ❌ Rejected:   {rejected}")
    print(f"   💥 Errors:     {errors}")
    print("=" * 72)


if __name__ == "__main__":
    main()
