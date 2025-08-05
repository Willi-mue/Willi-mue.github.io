import requests
import base64
import json
import os
import re
import time

GITHUB_USER = "Willi-Mue"
OUTPUT_DIR = "../data"

BLACKLIST = [
    GITHUB_USER.lower(),
    f"{GITHUB_USER.lower()}.github.io"
]

def get_readme_image(owner, repo):
    url = f"https://api.github.com/repos/{owner}/{repo}/readme"
    r = requests.get(url)
    if r.status_code != 200:
        return None
    try:
        data = r.json()
        content = base64.b64decode(data['content']).decode('utf-8')
    except Exception:
        return None

    match = re.search(r'!\[.*?\]\((.*?)\)', content)
    if match:
        img_url = match.group(1)
        if img_url.startswith('./') or not img_url.startswith('http'):
            img_url = f"https://raw.githubusercontent.com/{owner}/{repo}/master/{img_url.lstrip('./')}"
        return img_url
    return None

def fetch_all_repos(owner):
    repos = []
    page = 1
    while True:
        url = f"https://api.github.com/users/{owner}/repos?per_page=100&page={page}"
        r = requests.get(url)
        if r.status_code != 200:
            print("❌ Fehler beim Abrufen der Repositories.")
            break
        page_repos = r.json()
        if not page_repos:
            break
        repos.extend(page_repos)
        page += 1
    return repos

def fetch_languages(owner, repo):
    url = f"https://api.github.com/repos/{owner}/{repo}/languages"
    r = requests.get(url)
    if r.status_code != 200:
        return {}
    return r.json()

def fetch_projects(owner, existing_dict):
    repos = fetch_all_repos(owner)
    projects = []

    for repo in repos:
        name = repo["name"]
        if repo["private"]:
            continue
        if name.lower() in BLACKLIST:
            print(f"⏭️  Übersprungen (blacklist): {name}")
            continue

        # Hier prüfen, ob das Projekt bereits existiert
        if name in existing_dict:
            print(f"⏭️  Übersprungen (bereits vorhanden): {name}")
            projects.append(existing_dict[name])  # Bestehendes Projekt übernehmen
            continue

        print(f"🔍 Lade: {name}")
        image = get_readme_image(owner, name)
        languages = fetch_languages(owner, name)
        description = repo.get("description", "")

        # Immer leere Übersetzung verwenden
        translation = ""

        projects.append({
            "name": name,
            "description": description,
            "translation": translation,
            "url": repo["html_url"],
            "image": image,
            "languages": languages
        })
        time.sleep(0.2)

    return projects


if __name__ == "__main__":
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    output_filename = f"projects_{GITHUB_USER}.json"
    output_path = os.path.join(OUTPUT_DIR, output_filename)

    # Bestehende Datei laden, falls vorhanden
    if os.path.exists(output_path):
        with open(output_path, "r", encoding="utf-8") as f:
            existing_projects = json.load(f)
    else:
        existing_projects = []

    # In Dictionary umwandeln für schnellen Zugriff
    existing_dict = {proj["name"]: proj for proj in existing_projects}

    # Projekte abrufen und aktualisieren
    updated_projects = fetch_projects(GITHUB_USER, existing_dict)

    # Speichern
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(updated_projects, f, indent=2, ensure_ascii=False)

    print(f"\n✅ {len(updated_projects)} Projekte aktualisiert und gespeichert unter: {output_path}")
