# Contributing to Project Haxnation 🚩

First off, thank you for considering contributing to Project Haxnation! Our goal is to build a massive, high-quality, open-source repository of Capture The Flag (CTF) challenges for the cybersecurity community.

To ensure our automated systems can parse and serve your challenges to our website smoothly, please follow the guidelines below when submitting a new challenge or modifying an existing one.

## 📁 Repository Structure

The repository is organized by cybersecurity categories. Inside each category, every challenge has its own dedicated folder.

```text
project-haxnation/
├── Cryptography/
├── Digital Forensics/
├── Networking/
├── OSINT/
├── Programming/
├── Reverse Engineering/
└── Web Security/
    └── your-challenge-name/         <-- Create your folder here
        ├── challenge.json           <-- REQUIRED: The database schema
        ├── challenge_files...       <-- Scripts, zips, pcaps, etc.
        └── solutions/
            ├── solution.md          <-- REQUIRED: Writeup
            └── resources.md         <-- Optional extra resources
```

## 🛠️ How to Submit a New Challenge

1. **Fork the repository** and clone it to your local machine.
2. **Create a new branch** for your challenge: `git checkout -b add-web-my-new-challenge`
3. **Create a new folder** under the appropriate category. The folder name should be lowercase and use hyphens for spaces (e.g., `sql-injection-101`).
4. **Add your challenge assets** (source code, binaries, `.pcap` files, etc.) into the folder.
5. **Create a `challenge.json`** file in the root of your challenge folder (See the Schema section below).
6. **Create a `solutions/solution.md`** file detailing the step-by-step method to solve the challenge.
7. **Test your challenge locally** to ensure it works as intended.
8. **Commit, Push, and open a Pull Request!**

---

## 📄 The `challenge.json` Schema (CRITICAL)

We use an automated pipeline to sync this repository with our website's database. **Every challenge must have a valid `challenge.json` file.** Do not put flags or sensitive setup instructions in a `README.md`—use the JSON file as the single source of truth.

### Template

Copy and paste this template into your challenge folder and fill it out:

```json
{
  "id": "category-challenge-name",
  "name": "Challenge Title",
  "category": [
    "Web Security"
  ],
  "difficulty": "Easy",
  "authors": [
    {
      "name": "Your Name / Handle",
      "url": "https://github.com/yourusername"
    }
  ],
  "description": "<p>Your challenge description here. You can use basic <b>HTML tags</b> to format paragraphs, code blocks, or blockquotes.</p>",
  "hints": [
    "Hint 1 goes here.",
    "Hint 2 goes here."
  ],
  "flags": [
    "HXN{Your_Flag_Here}"
  ],
  "assets": [
    "./server.zip",
    "./source_code.py"
  ],
  "deployment": {
    "type": "static"
  }
}
```

### Schema Field Guide

* **`id`**: Must be unique, lowercase, and hyphenated. Format: `category-foldername` (e.g., `web-dev-at-99`).
* **`category`**: An array of categories. Usually just one, but can be multiple (e.g., `["Digital Forensics", "OSINT"]`).
* **`difficulty`**: Must be exactly one of: `"Easy"`, `"Medium"`, or `"Hard"`.
    * *Easy*: Requires basic concepts and out-of-the-box tools.
    * *Medium*: Requires custom scripting or combining multiple known vulnerabilities.
    * *Hard*: Requires advanced mathematics, deep reverse engineering, or zero-day concepts.
* **`description`**: The prompt shown to the user. Use HTML tags (`<p>`, `<br>`, `<code>`, `<blockquote>`, `<b>`) for formatting. Do not use Markdown here.
* **`hints`**: An array of strings. Leave empty `[]` if there are no hints.
* **`flags`**: An array of accepted flags. Please wrap flags in standard formats like `HXN{flag_here}` unless otherwise specified.
* **`assets`**: An array of relative file paths that the user needs to download to start the challenge (e.g., `"./capture.pcapng"`).
* **`deployment`**: Tells our infrastructure how to run the challenge.
    * `"type": "static"`: For downloadable files (crypto, forensics, reversing).
    * `"type": "docker"`: For containerized apps. (If using this, you must include a valid `Dockerfile` and specify `"internal_port": 8080` in the deployment object).

---

## ✅ Quality Assurance Checklist

Before submitting your PR, please ensure:
- [ ] Your `challenge.json` is valid JSON (no missing commas or trailing quotes).
- [ ] You have **not** written the flag in plain text inside any `README.md` files (to avoid spoiling it for repo browsers).
- [ ] Your solution writeup (`solutions/solution.md`) is clear, educational, and reproducible.
- [ ] If your challenge requires Docker, it builds successfully without errors (`docker build -t test .`).

## ⚖️ Code of Conduct
By participating in this project, you agree to abide by standard open-source etiquette. Be respectful, constructive in code reviews, and do not submit malicious code that could harm users' local machines outside the scope of a containerized CTF environment. 

Happy Hacking! 💻
