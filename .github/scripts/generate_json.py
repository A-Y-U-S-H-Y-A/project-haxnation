import os
import json
import markdown
import sys
import re
from bs4 import BeautifulSoup

def extract_metadata(readme_path):
    with open(readme_path, 'r', encoding='utf-8') as f:
        md_content = f.read()
        
        # Get flag format from the content
        flag_format_match = re.search(r'The flag is in the format `([^`]+)`', md_content)
        flag_format = flag_format_match.group(1) if flag_format_match else None
        
        # Convert markdown to HTML for easier parsing
        html = markdown.markdown(md_content)
        soup = BeautifulSoup(html, 'html.parser')

    # Get the first paragraph that's not part of a section as description
    description = ""
    first_h2 = soup.find('h2')
    if first_h2:
        prev_elements = list(first_h2.previous_siblings)
        for elem in reversed(prev_elements):
            if elem.name == 'p':
                description = elem.get_text(strip=True)
                break
    
    # Extract difficulty from the appropriate section
    difficulty = None
    difficulty_section = soup.find('h2', string=lambda t: 'difficulty' in t.lower() if t else False)
    if difficulty_section:
        next_elem = difficulty_section.find_next_sibling()
        if next_elem and next_elem.name == 'p':
            difficulty = next_elem.get_text(strip=True)
    
    # Initialize the data structure
    data = {
        "title": soup.find('h1').get_text(strip=True) if soup.find('h1') else os.path.basename(os.path.dirname(readme_path)),
        "path": readme_path,
        "description": description,
        "difficulty": difficulty,
        "tags": [],
        "authors": [],
        "learning_objectives": [],
        "setup": [],
        "flag_format": flag_format,
        "solution": None
    }

    # Helper function to extract list items from an unordered list
    def get_list_items(ul_element):
        if not ul_element or ul_element.name != 'ul':
            return []
        return [li.get_text(strip=True) for li in ul_element.find_all('li')]

    # Process each section based on its heading
    for h2 in soup.find_all('h2'):
        header = h2.get_text(strip=True).lower()

        if 'learning objectives' in header:
            ul = h2.find_next_sibling('ul')
            if ul:
                data["learning_objectives"] = get_list_items(ul)

        elif 'tags' in header:
            p = h2.find_next_sibling('p')
            if p:
                # Extract tags from backtick-formatted text
                tags_text = p.get_text()
                data["tags"] = [t.strip('`') for t in tags_text.split() if '`' in t]

        elif 'created by' in header:
            # Extract author information
            ul = h2.find_next_sibling('ul')
            if ul:
                for li in ul.find_all('li'):
                    author_info = {"name": None, "github": None}
                    author_link = li.find('a')
                    if author_link:
                        author_name = author_link.get_text(strip=True)
                        author_github = author_link.get('href')
                        author_info = {"name": author_name, "github": author_github}
                    else:
                        author_info = {"name": li.get_text(strip=True), "github": None}
                    data["authors"].append(author_info)

        elif 'how to setup' in header:
            setup_steps = []
            ul = h2.find_next_sibling('ul')
            if ul:
                setup_steps = get_list_items(ul)
            data["setup"] = setup_steps

        elif 'solutions and resources' in header:
            # Extract the flag value
            flag_pattern = re.compile(r'\*\*Flag\*\*:\s*`([^`]+)`')
            for p in h2.find_next_siblings('p'):
                flag_match = flag_pattern.search(p.get_text())
                if flag_match:
                    data["solution"] = flag_match.group(1)
                    break

    return data


    if __name__ == '__main__':
    changed_files = os.environ.get('CHANGED_FILES')
    if not changed_files:
        print("No changed README.md files.")
        sys.exit(0)

    try:
        changed_files = json.loads(changed_files)
    except json.JSONDecodeError:
        print(f"Error parsing CHANGED_FILES: {changed_files}")
        # If there's an error, try to work with README.md files in the current directory
        changed_files = []
        for root, _, files in os.walk('.'):
            for file in files:
                if file == 'README.md':
                    changed_files.append(os.path.join(root, file))
        if not changed_files:
            print("No README.md files found.")
            sys.exit(0)
    
    all_metadata = []

    for file in changed_files:
        if os.path.exists(file):
            print(f"Processing {file}...")
            metadata = extract_metadata(file)
            all_metadata.append(metadata)
            
            # Save individual README.json next to each README.md
            readme_dir = os.path.dirname(file)
            json_path = os.path.join(readme_dir, 'README.json')
            with open(json_path, 'w', encoding='utf-8') as out:
                json.dump(metadata, out, indent=2, ensure_ascii=False)
            print(f"Generated {json_path}")

    # Also save a combined file at the root
    if all_metadata:
        with open('Readme.json', 'w', encoding='utf-8') as out:
            json.dump(all_metadata, out, indent=2, ensure_ascii=False)
        print("Generated combined Readme.json")