import os
import json
import shutil
from pathlib import Path

# Configuration
REPO_ROOT = Path(__file__).parent.parent
DIST_DIR = REPO_ROOT / 'dist'
API_DIR = DIST_DIR / 'api'
CHALLENGES_API_DIR = API_DIR / 'challenges'

# Required fields for validation
REQUIRED_FIELDS = ['id', 'name', 'category', 'difficulty', 'authors']

def build_api():
    print("🚀 Starting Static API build...")
    
    # Clean and recreate dist directories
    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)
    CHALLENGES_API_DIR.mkdir(parents=True)

    lite_index = []
    challenge_count = 0

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

            # 2. Save the full JSON to the Deep Dive API endpoint
            full_json_path = CHALLENGES_API_DIR / f"{chal_id}.json"
            with open(full_json_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, separators=(',', ':')) # Minified

            # 3. Append to the Lite Index (Only what is needed for searching/filtering)
            lite_entry = {
                "id": chal_id,
                "name": data['name'],
                "category": data['category'],
                "difficulty": data['difficulty']
            }
            lite_index.append(lite_entry)
            challenge_count += 1

    # 4. Save the Master Lite Index
    lite_index_path = API_DIR / 'challenges-lite.json'
    with open(lite_index_path, 'w', encoding='utf-8') as f:
        json.dump(lite_index, f, separators=(',', ':')) # Minified

    print(f"✅ Successfully built API for {challenge_count} challenges!")
    print(f"📁 Output located in: {DIST_DIR}")

if __name__ == "__main__":
    build_api()