import os
import json
import markdown
import sys
from bs4 import BeautifulSoup

def extract_metadata(readme_path):
    with open(readme_path, 'r', encoding='utf-8') as f:
        md_content = f.read()
        html = markdown.markdown(md_content)
        soup = BeautifulSoup(html, 'html.parser')

    def get_list_from_next_ul(h2):
        ul = h2.find_next_sibling('ul')
        return [li.get_text(strip=True) for li in ul.find_all('li')] if ul else []

    data = {
        "title": soup.find('h1').get_text(strip=True) if soup.find('h1') else os.path.basename(os.path.dirname(readme_path)),
        "path": readme_path,
        "description": soup.find('p').get_text(strip=True) if soup.find('p') else "",
        "difficulty": None,
        "tags": [],
        "author": {"name": None, "github": None},
        "learning_objectives": [],
        "setup": [],
        "flag_format": None,
        "solutions": []
    }

    for h2 in soup.find_all('h2'):
        header = h2.get_text(strip=True).lower()

        if 'learning objectives' in header:
            data["learning_objectives"] = get_list_from_next_ul(h2)

        elif 'tags' in header:
            p = h2.find_next('p')
            if p:
                data["tags"] = [t.strip('`') for t in p.get_text().split() if t.startswith('`')]

        elif 'created by' in header:
            p = h2.find_next('p')
            if p and p.find('a'):
                data["author"]["name"] = p.get_text(strip=True)
                data["author"]["github"] = p.find('a').get('href')
            elif p:
                data["author"]["name"] = p.get_text(strip=True)

        elif 'how to setup' in header:
            section = h2.find_next_sibling()
            while section and section.name in ['p', 'ul']:
                if section.name == 'ul':
                    data["setup"] += [li.get_text(strip=True) for li in section.find_all('li')]
                else:
                    data["setup"].append(section.get_text(strip=True))
                section = section.find_next_sibling()

        elif 'flag' in header:
            p = h2.find_next('p')
            if p:
                data["flag_format"] = p.get_text(strip=True)

        elif 'solutions and resources' in header:
            section = h2.find_next_sibling()
            while section and section.name in ['p', 'ul']:
                data["solutions"].append(section.get_text(strip=True))
                section = section.find_next_sibling()

    return data


if __name__ == '__main__':
    changed_files = os.environ.get('CHANGED_FILES')
    if not changed_files:
        print("No changed README.md files.")
        sys.exit(0)

    changed_files = json.loads(changed_files)
    all_metadata = []

    for file in changed_files:
        if os.path.exists(file):
            metadata = extract_metadata(file)
            all_metadata.append(metadata)

    with open('Readme.json', 'w', encoding='utf-8') as out:
        json.dump(all_metadata, out, indent=2, ensure_ascii=False)
