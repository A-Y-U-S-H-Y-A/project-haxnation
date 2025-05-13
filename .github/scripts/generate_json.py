import os
import json
import markdown
import sys
import re
from bs4 import BeautifulSoup, Tag # Import Tag for type checking

def find_elements_until_next_heading(start_node, heading_tag='h2'):
    """
    Generator that yields sibling elements after start_node until
    the next heading_tag or the end of siblings.
    """
    for sibling in start_node.find_next_siblings():
        if isinstance(sibling, Tag) and sibling.name == heading_tag:
            break
        yield sibling

def extract_metadata(readme_path):
    """
    Extracts structured metadata from a README.md file.
    """
    try:
        with open(readme_path, 'r', encoding='utf-8') as f:
            md_content = f.read()
    except FileNotFoundError:
        print(f"Error: README file not found at {readme_path}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"Error reading file {readme_path}: {e}", file=sys.stderr)
        return None

    # --- Pre-processing and Initial Extractions ---

    # Get flag format (searches the raw Markdown)
    flag_format_match = re.search(r'The flag is in the format `([^`]+)`', md_content, re.IGNORECASE)
    flag_format = flag_format_match.group(1) if flag_format_match else None

    # Convert markdown to HTML
    try:
        html = markdown.markdown(md_content)
        soup = BeautifulSoup(html, 'html.parser')
    except Exception as e:
        print(f"Error converting Markdown to HTML for {readme_path}: {e}", file=sys.stderr)
        return None

    # --- Default Data Structure ---
    # Use directory name as a potential fallback title
    fallback_title = os.path.basename(os.path.dirname(readme_path))
    if not fallback_title: # Handle case where readme_path is in the root '.'
        fallback_title = os.path.basename(readme_path)

    data = {
        "title": None, # Will be extracted from H1
        "path": readme_path,
        "description": "",
        "difficulty": None,
        "tags": [],
        "authors": [],
        "learning_objectives": [],
        "setup": [],
        "flag_format": flag_format,
        "solution": None
    }

    # --- Extract Title (H1) ---
    first_h1 = soup.find('h1')
    if first_h1:
        data["title"] = first_h1.get_text(strip=True)
    else:
        print(f"Warning: No H1 title found in {readme_path}. Using fallback: {fallback_title}")
        data["title"] = fallback_title # Use directory name if no H1

    # --- Extract Description (Content before first H2) ---
    first_h2 = soup.find('h2')
    description_elements = []
    start_node = first_h1 if first_h1 else None # Start after H1 if it exists

    # If H1 exists, get siblings between H1 and H2
    if start_node and first_h2:
         # Iterate siblings between H1 and H2
        for elem in start_node.find_next_siblings():
            if elem == first_h2:
                break
            if isinstance(elem, Tag) and elem.name == 'p':
                 text = elem.get_text(strip=True)
                 if text:
                     description_elements.append(text)
    # If no H2, consider all paragraphs after H1 (or from start if no H1)
    elif not first_h2:
         start_search_node = start_node if start_node else soup # If no H1, search from root soup object
         if start_search_node:
             for elem in start_search_node.find_next_siblings('p'):
                  text = elem.get_text(strip=True)
                  if text:
                      description_elements.append(text)
    # Fallback: Use original logic if the above yields nothing (last p before h2)
    if not description_elements and first_h2:
         prev_elements = list(first_h2.previous_siblings)
         for elem in reversed(prev_elements):
             if isinstance(elem, Tag) and elem.name == 'p':
                 text = elem.get_text(strip=True)
                 if text:
                    description_elements.append(text)
                    break # Found the last one

    data["description"] = " ".join(description_elements)

    # --- Process Sections based on H2 Headings ---
    all_h2s = soup.find_all('h2')
    for i, h2 in enumerate(all_h2s):
        header_text = h2.get_text(strip=True).lower()
        section_content_nodes = list(find_elements_until_next_heading(h2, heading_tag='h2'))

        # Helper to get list items from UL/OL within the section nodes
        def get_list_items_from_section(nodes):
            items = []
            for node in nodes:
                if isinstance(node, Tag) and node.name in ['ul', 'ol']:
                    for li in node.find_all('li', recursive=False): # Only direct children li
                        item_text = li.get_text(strip=True)
                        if item_text:
                            items.append(item_text)
                # Also check if node itself is a list item if structure is flat
                elif isinstance(node, Tag) and node.name == 'li':
                     item_text = node.get_text(strip=True)
                     if item_text:
                         items.append(item_text)
            return items

        # Helper to get text from paragraphs within the section nodes
        def get_paragraph_texts_from_section(nodes):
            texts = []
            for node in nodes:
                if isinstance(node, Tag) and node.name == 'p':
                    para_text = node.get_text(strip=True)
                    if para_text:
                        texts.append(para_text)
            return texts

        # --- Extract Difficulty ---
        if 'difficulty' in header_text:
            # Find first non-empty paragraph text in the section
            paragraph_texts = get_paragraph_texts_from_section(section_content_nodes)
            if paragraph_texts:
                data["difficulty"] = paragraph_texts[0]
            else:
                # Alternative: check list items? For now, primarily expect paragraph.
                list_items = get_list_items_from_section(section_content_nodes)
                if list_items:
                    data["difficulty"] = list_items[0] # Take first list item if no para

        # --- Extract Learning Objectives ---
        elif 'learning objectives' in header_text:
            data["learning_objectives"] = get_list_items_from_section(section_content_nodes)

        # --- Extract Tags ---
        elif 'tags' in header_text:
            tags = []
            paragraph_texts = get_paragraph_texts_from_section(section_content_nodes)
            list_items = get_list_items_from_section(section_content_nodes)

            # Check paragraphs for backticked items
            for text in paragraph_texts:
                found_tags = re.findall(r'`([^`]+)`', text)
                tags.extend([t.strip() for t in found_tags])
                # Also check simple comma/space separated if no backticks found yet
                if not found_tags and not tags:
                    # Simple split, remove empty strings, assumes tags are single words
                    potential_tags = [t.strip().strip(',.;') for t in text.split() if t.strip().strip(',.;')]
                    # Basic heuristic: add if it looks like a tag (e.g., alphanumeric, hyphen)
                    tags.extend([pt for pt in potential_tags if re.match(r'^[a-zA-Z0-9_-]+$', pt)])


            # Check list items
            for item in list_items:
                 # Assume list items are individual tags, strip backticks if present
                 tag = item.strip().strip('`')
                 if tag:
                     tags.append(tag)

            # Remove duplicates and ensure uniqueness
            data["tags"] = sorted(list(set(t for t in tags if t))) # Filter empty strings

        # --- Extract Authors (Created By) ---
        elif 'created by' in header_text or 'author' in header_text:
            authors_list = []
            list_items_nodes = []
            for node in section_content_nodes:
                 if isinstance(node, Tag) and node.name in ['ul', 'ol']:
                      list_items_nodes.extend(node.find_all('li', recursive=False))
                 elif isinstance(node, Tag) and node.name == 'li': # Handle flat list items
                      list_items_nodes.append(node)

            for li in list_items_nodes:
                author_link = li.find('a')
                author_info = {"name": None, "github": None}
                if author_link and author_link.has_attr('href'):
                    name = author_link.get_text(strip=True)
                    href = author_link['href']
                    # Basic check if it's a GitHub link
                    if 'github.com' in href:
                         author_info = {"name": name if name else href, "github": href}
                    else: # Assume it's a name and some other link
                         author_info = {"name": name if name else li.get_text(strip=True), "github": None} # Store link elsewhere?
                else:
                    # No link, just take the text
                    name = li.get_text(strip=True)
                    if name:
                        author_info = {"name": name, "github": None}

                if author_info["name"]: # Only add if we found a name
                    authors_list.append(author_info)
            data["authors"] = authors_list


        # --- Extract Setup Steps ---
        elif 'setup' in header_text or 'installation' in header_text:
             data["setup"] = get_list_items_from_section(section_content_nodes)
             # If no list items, maybe it's in paragraphs/code blocks?
             if not data["setup"]:
                  setup_paras = get_paragraph_texts_from_section(section_content_nodes)
                  if setup_paras:
                      # Combine paragraphs into steps or keep as one block? Let's combine.
                      data["setup"] = setup_paras # Treat each para as a step/instruction


        # --- Extract Solution Flag ---
        elif 'solution' in header_text or 'resource' in header_text:
             # Look for **Flag**: `flag_value` in paragraphs within this section
             flag_pattern = re.compile(r'\*\*Flag\*\*:\s*`([^`]+)`')
             paragraph_texts = get_paragraph_texts_from_section(section_content_nodes)
             for p_text in paragraph_texts:
                 flag_match = flag_pattern.search(p_text)
                 if flag_match:
                     data["solution"] = flag_match.group(1)
                     break # Found the flag, stop searching this section

    return data

# =========================================
# Main Execution Block
# =========================================
if __name__ == '__main__':
    # --- Get List of Files to Process ---
    changed_files_json = os.environ.get('CHANGED_FILES')
    target_files = []

    if changed_files_json:
        print("Processing files from CHANGED_FILES environment variable.")
        try:
            target_files = json.loads(changed_files_json)
            # Ensure it's a list
            if not isinstance(target_files, list):
                 print(f"Error: CHANGED_FILES was not a JSON list: {changed_files_json}", file=sys.stderr)
                 target_files = [] # Reset
        except json.JSONDecodeError:
            print(f"Error parsing CHANGED_FILES JSON: {changed_files_json}", file=sys.stderr)
            # Keep target_files empty, fallback will trigger if needed
    else:
         print("CHANGED_FILES environment variable not set or empty.")

    # Fallback: If no files from env var, find all README.md recursively
    if not target_files:
        print("Falling back to searching for all 'README.md' files recursively from '.'")
        for root, _, files_in_dir in os.walk('.'):
            for filename in files_in_dir: # Use 'filename' to avoid shadowing outer loop var
                if filename.lower() == 'readme.md': # Case-insensitive check
                    target_files.append(os.path.join(root, filename))
        if not target_files:
             print("No README.md files found in fallback search.")
             sys.exit(0) # Exit cleanly if no files found

    print(f"Found {len(target_files)} README file(s) to process.")

    # --- Process Each File ---
    all_metadata = []
    processed_count = 0
    error_count = 0

    for file_path in target_files:
        # Basic filtering: ensure it's actually a README.md file path if needed
        if not file_path.lower().endswith('readme.md'):
             print(f"Skipping non-README file listed: {file_path}")
             continue

        if os.path.exists(file_path) and os.path.isfile(file_path):
            print(f"Processing {file_path}...")
            metadata = extract_metadata(file_path)
            if metadata:
                all_metadata.append(metadata)
                processed_count += 1

                # --- Save Individual README.json ---
                readme_dir = os.path.dirname(file_path)
                # Use consistent 'README.json' naming
                json_path = os.path.join(readme_dir, 'README.json')
                try:
                    with open(json_path, 'w', encoding='utf-8') as out:
                        json.dump(metadata, out, indent=2, ensure_ascii=False)
                    print(f"--> Generated {json_path}")
                except IOError as e:
                     print(f"Error writing JSON file {json_path}: {e}", file=sys.stderr)
                     error_count += 1
            else:
                 print(f"--> Failed to extract metadata from {file_path}")
                 error_count += 1
        else:
            print(f"Warning: File path '{file_path}' does not exist or is not a file. Skipping.")

    # --- Save Combined File ---
    if all_metadata:
        # Use consistent 'README.json' naming for combined file too? Or 'all_metadata.json'?
        # Let's use 'all_challenges_metadata.json' for clarity.
        combined_json_path = 'all_challenges_metadata.json'
        print(f"\nSaving combined metadata for {processed_count} file(s) to {combined_json_path}...")
        try:
            with open(combined_json_path, 'w', encoding='utf-8') as out:
                json.dump(all_metadata, out, indent=2, ensure_ascii=False)
            print(f"Generated combined metadata file: {combined_json_path}")
        except IOError as e:
             print(f"Error writing combined JSON file {combined_json_path}: {e}", file=sys.stderr)
             error_count += 1
    else:
        print("\nNo metadata extracted, combined file not generated.")

    print(f"\nProcessing complete. Processed: {processed_count}, Errors/Skipped: {error_count}")

    # Exit with error code if any errors occurred during processing/writing
    if error_count > 0:
        sys.exit(1)