import os
import json
import shutil
from pathlib import Path

# Configuration
REPO_ROOT = Path(__file__).parent.parent
DIST_DIR = REPO_ROOT / 'dist'
API_DIR = DIST_DIR / 'api'
CHALLENGES_API_DIR = API_DIR / 'challenges'
SOC_API_DIR = DIST_DIR / 'soc-api'
SOC_CHALLENGES_API_DIR = SOC_API_DIR / 'challenges'
STORYLINES_DIR = REPO_ROOT / 'Storylines'
EVENTS_API_DIR = API_DIR / 'events'

# Required fields for validation
REQUIRED_FIELDS = ['id', 'name', 'category', 'difficulty']

def build_api():
    print("🚀 Starting Static API build...")
    
    # Clean and recreate dist directories
    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)
    CHALLENGES_API_DIR.mkdir(parents=True)
    SOC_CHALLENGES_API_DIR.mkdir(parents=True)

    lite_index_main = []
    lite_index_soc = []
    challenge_count_main = 0
    challenge_count_soc = 0
    challenges_by_id = {}

    # Crawl the repository for challenge.json files
    for root, _, files in os.walk(REPO_ROOT):
        # Skip hidden directories and the dist directory
        if '.git' in root or 'dist' in root or 'scripts' in root:
            continue
            
        if 'challenge.json' in files:
            json_path = Path(root) / 'challenge.json'
            
            with open(json_path, 'r', encoding='utf-8') as f:
                try:
                    data = json.load(f)
                except json.JSONDecodeError:
                    print(f"❌ ERROR: Invalid JSON format in {json_path}")
                    exit(1)

            # 1. Validation
            missing_fields = [field for field in REQUIRED_FIELDS if field not in data]
            if missing_fields:
                print(f"❌ ERROR: Missing required fields {missing_fields} in {json_path}")
                exit(1)

            chal_id = data['id']

            # Calculate the exact folder path relative to the repo root (e.g., "Web Security/dev-at-99")
            rel_path = os.path.relpath(root, REPO_ROOT).replace('\\', '/')
            data['repo_path'] = rel_path
            
            is_soc = rel_path.startswith('SOC')

            # 2. Save the full JSON to the Deep Dive API endpoint
            if is_soc:
                full_json_path = SOC_CHALLENGES_API_DIR / f"{chal_id}.json"
            else:
                full_json_path = CHALLENGES_API_DIR / f"{chal_id}.json"
                
            with open(full_json_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, separators=(',', ':')) # Minified

            # 3. Append to the Lite Index (Only what is needed for searching/filtering)
            # Extract just the names into a flat list for easy searching
            author_names = [author['name'] for author in data.get('authors', [])]
            
            alert_count = 0
            if is_soc:
                for asset in data.get('assets', []):
                    if asset.endswith('.json'):
                        asset_path = Path(root) / asset
                        if asset_path.exists():
                            with open(asset_path, 'r', encoding='utf-8') as af:
                                try:
                                    alerts = json.load(af)
                                    if isinstance(alerts, list):
                                        alert_count += len(alerts)
                                except json.JSONDecodeError:
                                    pass

            lite_entry = {
                "id": chal_id,
                "name": data['name'],
                "category": data['category'],
                "difficulty": data['difficulty'],
                "authors": author_names  # Added authors to the lite index
            }
            
            if is_soc:
                lite_entry['alert_count'] = alert_count
                lite_index_soc.append(lite_entry)
                challenge_count_soc += 1
            else:
                lite_index_main.append(lite_entry)
                challenge_count_main += 1

            challenges_by_id[chal_id] = data

    # 4. Save the Master Lite Indexes
    lite_index_main_path = API_DIR / 'challenges-lite.json'
    with open(lite_index_main_path, 'w', encoding='utf-8') as f:
        json.dump(lite_index_main, f, separators=(',', ':')) # Minified
        
    lite_index_soc_path = SOC_API_DIR / 'challenges-lite.json'
    with open(lite_index_soc_path, 'w', encoding='utf-8') as f:
        json.dump(lite_index_soc, f, separators=(',', ':')) # Minified

    # 5. Storylines: merge each manifest in Storylines/*.json with the crawled
    #    challenge.json files and emit a self-contained event document.
    #    Storyline challenges are also part of the flat lite index (by design —
    #    they are regular practice challenges too).
    if STORYLINES_DIR.exists():
        events_lite = []
        EVENTS_API_DIR.mkdir(parents=True, exist_ok=True)

        for manifest_path in sorted(STORYLINES_DIR.glob('*.json')):
            with open(manifest_path, 'r', encoding='utf-8') as f:
                try:
                    manifest = json.load(f)
                except json.JSONDecodeError:
                    print(f"❌ ERROR: Invalid JSON format in {manifest_path}")
                    exit(1)

            event_id = manifest.get('id')
            event_name = manifest.get('name')
            chapters = manifest.get('chapters')
            if not event_id or not event_name or not isinstance(chapters, list) or not chapters:
                print(f"❌ ERROR: Storyline manifest {manifest_path} needs id, name and a non-empty chapters array")
                exit(1)

            points_total = 0
            merged_chapters = []
            for ch_meta in chapters:
                ch_id = ch_meta.get('id')
                ch_data = challenges_by_id.get(ch_id)
                if ch_data is None:
                    print(f"❌ ERROR: Storyline '{event_id}' references unknown chapter id '{ch_id}' (not found in any challenge.json)")
                    exit(1)
                ch_points = int(ch_data.get('points', 0))
                if ch_data.get('questions'):
                    ch_points = sum(int(q.get('points', 0)) for q in ch_data['questions'])
                points_total += ch_points
                merged_chapters.append({
                    **ch_data,
                    'story': {
                        'order': ch_meta.get('order'),
                        'act': ch_meta.get('act'),
                        'when': ch_meta.get('when'),
                        'open': ch_meta.get('open'),
                        'close': ch_meta.get('close'),
                    },
                })

            merged_chapters.sort(key=lambda c: (c.get('story', {}).get('order') or 0))

            # sanity: manifest's declared points_total must match the computed sum
            declared = manifest.get('points_total')
            if declared is not None and int(declared) != points_total:
                print(f"⚠️  WARNING: Storyline '{event_id}' points_total={declared} but computed {points_total} from chapters")

            events_lite.append({
                'id': event_id,
                'name': event_name,
                'subtitle': manifest.get('subtitle', ''),
                'org': manifest.get('org', ''),
                'chapters': len(merged_chapters),
                'points_total': points_total,
                'tags': ['storyline'],
            })

            event_doc = {
                **manifest,
                'points_total': points_total,
                'chapters': merged_chapters,
            }
            event_path = EVENTS_API_DIR / f"{event_id}.json"
            with open(event_path, 'w', encoding='utf-8') as f:
                json.dump(event_doc, f, separators=(',', ':'))

        events_lite_path = API_DIR / 'events-lite.json'
        with open(events_lite_path, 'w', encoding='utf-8') as f:
            json.dump(events_lite, f, separators=(',', ':'))

        print(f"📖 Built {len(events_lite)} storyline event(s) → api/events-lite.json + api/events/<id>.json")

    # 6. Save the Total Challenges Count for Shields.io Widget
    total_challenges = challenge_count_main + challenge_count_soc
    badge_data = {
        "schemaVersion": 1,
        "label": "challenges",
        "message": str(total_challenges),
        "color": "blue"
    }
    badge_path = API_DIR / 'badge.json'
    with open(badge_path, 'w', encoding='utf-8') as f:
        json.dump(badge_data, f)

    print(f"✅ Successfully built API for {challenge_count_main} main challenges and {challenge_count_soc} SOC challenges!")
    print(f"📁 Output located in: {DIST_DIR}")

if __name__ == "__main__":
    build_api()
