import requests
import base64
import json
import os
import re
import sys
import time

GITHUB_USER = "Willi-Mue"
# Relativ zum Skript, nicht zum aktuellen Arbeitsverzeichnis
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
API = "https://api.github.com"

BLACKLIST = [
    GITHUB_USER.lower(),
    f"{GITHUB_USER.lower()}.github.io"
]

# Optional: GITHUB_TOKEN setzen, um das Limit von 60 Anfragen/Stunde zu umgehen.
session = requests.Session()
session.headers["Accept"] = "application/vnd.github+json"
if os.environ.get("GITHUB_TOKEN"):
    session.headers["Authorization"] = f"Bearer {os.environ['GITHUB_TOKEN']}"

class ApiError(Exception):
    pass


def translate_de(text):
    """Englische GitHub-Beschreibung per Google Translate (ohne Key) ins Deutsche übersetzen."""
    r = requests.get(
        "https://translate.googleapis.com/translate_a/single",
        params={"client": "gtx", "sl": "en", "tl": "de", "dt": "t", "q": text},
        timeout=30,
    )
    if r.status_code != 200:
        raise ApiError(f"Google Translate {r.status_code}: {r.text[:200]}")
    # Antwort: [[["Satz DE", "Satz EN", ...], ...], ...] -> Sätze zusammensetzen
    return "".join(part[0] for part in r.json()[0] if part[0]).strip()


def api_get(path, allow_404=False):
    r = session.get(f"{API}{path}")  # folgt 301-Weiterleitungen umbenannter Repos
    if allow_404 and r.status_code == 404:
        return None
    if r.status_code != 200:
        msg = r.json().get("message", "") if r.headers.get("content-type", "").startswith("application/json") else ""
        if r.status_code in (403, 429) and r.headers.get("x-ratelimit-remaining") == "0":
            reset = time.strftime("%H:%M", time.localtime(int(r.headers.get("x-ratelimit-reset", "0"))))
            msg = (f"GitHub-Rate-Limit erreicht (wieder frei ab {reset} Uhr). "
                   "Mit Token geht es sofort: GITHUB_TOKEN setzen (Personal Access Token, ohne Rechte reicht).")
        raise ApiError(f"{r.status_code} bei {path}: {msg}")
    return r.json()


def get_readme_image(owner, repo, branch):
    data = api_get(f"/repos/{owner}/{repo}/readme", allow_404=True)
    if not data:
        return None
    try:
        content = base64.b64decode(data['content']).decode('utf-8')
    except Exception:
        return None

    # Bilder der README, egal ob Markdown ![..](..) oder HTML <img src="..">.
    # Ein GIF (animiert) hat Vorrang, sonst das erste Bild. Kaputte Links werden übersprungen.
    pattern = r'!\[[^\]]*\]\(\s*<?([^)\s>]+)|<img[^>]*?\bsrc=["\']([^"\']+)["\']'
    urls = []
    for match in re.finditer(pattern, content, re.IGNORECASE):
        img_url = match.group(1) or match.group(2)
        if not img_url.startswith('http'):
            img_url = img_url.removeprefix('./').lstrip('/')
            img_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{img_url}"
        if img_url not in urls:
            urls.append(img_url)

    def is_gif(url):
        return url.split('?')[0].lower().endswith('.gif')

    # Stabile Sortierung: GIFs nach vorne, sonst README-Reihenfolge
    for img_url in sorted(urls, key=lambda u: not is_gif(u)):
        try:
            ok = requests.head(img_url, allow_redirects=True, timeout=15).status_code == 200
        except requests.RequestException:
            ok = False
        if ok:
            return img_url
        print(f"  ! README-Bild nicht erreichbar: {img_url}")
    return None


def fetch_all_repos(owner):
    repos = []
    page = 1
    while True:
        page_repos = api_get(f"/users/{owner}/repos?per_page=100&page={page}")
        if not page_repos:
            break
        repos.extend(page_repos)
        page += 1
    return repos


def resolve_ids(owner, existing_projects):
    """Alte Einträge ohne "id" über den Namen nachschlagen.
    GitHub leitet umbenannte Repos weiter, so wird z. B. Pacman-Clone -> Starbot-Maze erkannt."""
    for proj in existing_projects:
        if "id" in proj:
            continue
        data = api_get(f"/repos/{owner}/{proj['name']}", allow_404=True)
        if data:
            proj["id"] = data["id"]
            if data["name"] != proj["name"]:
                print(f"Umbenannt erkannt: {proj['name']} -> {data['name']}")


def fetch_projects(owner, existing_by_id):
    repos = fetch_all_repos(owner)
    projects = []

    for repo in repos:
        name = repo["name"]
        if repo["private"]:
            continue
        if name.lower() in BLACKLIST:
            print(f"Übersprungen (blacklist): {name}")
            continue

        old = existing_by_id.get(repo["id"], {})
        print(f"{'Aktualisiere' if old else 'Neu'}: {name}")

        branch = repo.get("default_branch", "main")
        # Die GitHub-Beschreibung ist die einzige Quelle; Deutsch wird daraus übersetzt.
        description = (repo.get("description") or "").strip()
        translation = old.get("translation", "")
        # Nur neu übersetzen, wenn sich der englische Text seit der letzten Übersetzung geändert hat.
        if description != old.get("translation_source"):
            if not description:
                translation = ""
                print("  ! Keine Beschreibung auf GitHub")
            else:
                translation = translate_de(description)
                print(f"  Übersetzt: {translation}")

        if old and old.get("name") != name:
            print(f"  ! Umbenannt von {old['name']}")

        projects.append({
            "id": repo["id"],
            "name": name,
            "description": description,
            "translation": translation,
            # Englischer Text, aus dem "translation" erzeugt wurde (leer = noch nicht übersetzt)
            "translation_source": description if translation else "",
            "url": repo["html_url"],
            "image": get_readme_image(owner, name, branch) or old.get("image"),
            "languages": api_get(f"/repos/{owner}/{name}/languages"),
        })
        time.sleep(0.2)

    kept_ids = {p["id"] for p in projects}
    for proj in existing_by_id.values():
        if proj["id"] not in kept_ids:
            print(f"Entfernt (nicht mehr öffentlich/vorhanden): {proj['name']}")

    return projects


if __name__ == "__main__":
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    output_path = os.path.join(OUTPUT_DIR, f"projects_{GITHUB_USER}.json")

    existing_projects = []
    if os.path.exists(output_path):
        with open(output_path, "r", encoding="utf-8") as f:
            existing_projects = json.load(f)
    print(f"Datei: {os.path.normpath(output_path)} ({len(existing_projects)} bestehende Projekte)\n")

    try:
        resolve_ids(GITHUB_USER, existing_projects)
        existing_by_id = {p["id"]: p for p in existing_projects if "id" in p}
        for p in existing_projects:
            if "id" not in p:
                print(f"Entfernt (Repo existiert nicht mehr): {p['name']}")
        updated_projects = fetch_projects(GITHUB_USER, existing_by_id)
    except (ApiError, requests.RequestException) as e:
        sys.exit(f"\nAbbruch, Datei bleibt unverändert: {e}")

    if not updated_projects:
        sys.exit("\nAbbruch: GitHub hat keine Projekte geliefert, Datei bleibt unverändert.")

    updated_projects.sort(key=lambda p: p["name"].lower())
    tmp_path = output_path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(updated_projects, f, indent=2, ensure_ascii=False)
        f.write("\n")
    os.replace(tmp_path, output_path)

    print(f"\n{len(updated_projects)} Projekte gespeichert unter: {os.path.normpath(output_path)}")
