# <picture> <source srcset="assets/logo-dark.png" media="(prefers-color-scheme: dark)"> <img src="assets/logo-light.png" width="200" alt="Project Haxnation Logo"> </picture>


[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://github.com/A-Y-U-S-H-Y-A/project-haxnation/blob/master/LICENSE)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg)](https://github.com/A-Y-U-S-H-Y-A/project-haxnation/pulls)
[![Challenges](https://img.shields.io/endpoint?url=https://a-y-u-s-h-y-a.github.io/project-haxnation/api/badge.json)](https://github.com/A-Y-U-S-H-Y-A/project-haxnation)
[![Made with ❤️ by Ayushya Shah](https://img.shields.io/badge/Made%20with-%E2%9D%A4-red)](mailto:ayushya.shah1201@gmail.com)

**Project Haxnation** is an initiative by **Ayushya Shah** to create the **largest open-source repository of CTF (Capture The Flag) challenges** for security enthusiasts to explore, practice, and master various domains of cybersecurity.

---

## 📖 Storyline Events

In addition to the flat challenge collection, Project Haxnation ships **storyline events** — ordered, narrative-driven sequences of challenges played as a case file:

- **[Operation Coinnectar](https://ctf.haxnation.org/#/ctf/practice/events/operation-coinnectar)** — *The Coinnectar Supply-Chain Incident* (HaxNation × FOSS Mumbai). 11 chapters across 6 acts — reconstruct a supply-chain compromise from the first bad commit through the backdoors to the privileged build runner. ~2,500 points. Also available in the regular practice grid.

Storyline manifests live in [`Storylines/`](./Storylines) (`Storylines/*.json`) and are built into the static API as `api/events-lite.json` and `api/events/<id>.json`. Storyline chapters are ordinary challenges with optional extra fields — see the schema notes in [CONTRIBUTING.md](./CONTRIBUTING.md#optional-storyline-fields).

---

## 💡 Motivation

Most existing CTF platforms provide either limited free content or restrict full access behind paywalls. This can hinder the learning curve, especially for beginners or students.

Additionally, challenges often lack open-source code, which limits the ability of developers to:

- Analyze how the challenge was built  
- Learn secure and insecure coding patterns  
- Modify and contribute to existing content

**Project Haxnation** is here to change that—by making high-quality, self-contained challenges freely available and open-sourced under GNU GPL v3.

---

## ⚙️ Tech Stack

There is **no single fixed tech stack**. Each challenge may use different tools or environments based on its domain.  
Some may be written in Python, C, JavaScript, Bash, etc. Others may involve packet captures, Docker, or low-level binaries.

Refer to the specific challenge's `README.md` file for setup instructions and requirements.

---

## 📦 How to Use

1. **Browse** the repository.
2. Navigate to the **folder** corresponding to the domain you're interested in.
3. Choose a **challenge**.
4. Open the `README.md` inside that challenge folder to:
   - Set up the challenge
   - Understand the rules and goals
   - Get hints (if available)
5. Launch the challenge and start solving!

---

## 🤝 Contributing

Want to contribute your own challenge or improvement? We welcome community contributions!

Checkout [CONTRIBUTING.md](https://github.com/A-Y-U-S-H-Y-A/project-haxnation/CONTRIBUTING.md) for more information.

---

## 📬 Contact

Have questions, ideas, or feedback?

📧 **ayushya.shah1201@gmail.com**

---

## 📜 License

This project is licensed under the [GNU General Public License v3](https://github.com/A-Y-U-S-H-Y-A/project-haxnation/blob/master/LICENSE).

---

⭐ If you like this project, consider giving it a **star** to support the mission!
