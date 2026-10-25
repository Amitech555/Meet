"""Embarque l'export web (dist-demo) dans un seul fichier HTML : scripts, feuilles de style et polices.

Le fichier produit ne contient pas de <!doctype>/<html>/<head>/<body> : l'hébergeur d'aperçu les ajoute.
"""
import base64
import mimetypes
import pathlib
import re
import sys

root = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])
html = (root / "index.html").read_text()

mimetypes.add_type("font/ttf", ".ttf")


def data_uri(rel: str) -> str:
    path = root / rel.lstrip("/")
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}"


def embed_assets(js: str) -> str:
    # Les chemins d'assets (polices, images) sont des chaînes "/assets/..." dans le bundle
    def repl(m):
        rel = m.group(2)
        return m.group(1) + data_uri(rel) + m.group(1) if (root / rel.lstrip("/")).exists() else m.group(0)

    return re.sub(r'(["\'])(/assets/[^"\']+?\.(?:ttf|otf|png|jpg|jpeg|webp|svg))\1', repl, js)


styles = []
for href in re.findall(r'<link rel="stylesheet" href="([^"]+)"', html):
    styles.append((root / href.lstrip("/")).read_text())

scripts = []
for src in re.findall(r'<script src="([^"]+)"', html):
    js = embed_assets((root / src.lstrip("/")).read_text())
    scripts.append(js.replace("</script", "<\\/script"))

# Styles de base de l'export Expo (plein écran, pas de défilement du body)
base_styles = "\n".join(re.findall(r"<style[^>]*>(.*?)</style>", html, re.S))

page = f"""<title>Partants</title>
<meta name="description" content="Aperçu de Partants : trouver, créer et rejoindre des activités à Montréal.">
<style>
:root {{ --bg: #FAF7F2; color-scheme: light }}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --bg: #0F0E0D; color-scheme: dark }} }}
:root[data-theme="dark"] {{ --bg: #0F0E0D; color-scheme: dark }}
html, body {{ height: 100%; background: var(--bg); }}
{base_styles}
{''.join(styles)}
</style>
<div id="root"></div>
{''.join(f'<script>{s}</script>' for s in scripts)}
"""
out.write_text(page)
print(f"{out} : {out.stat().st_size / 1e6:.1f} Mo, {len(scripts)} script(s), {len(styles)} feuille(s) de style")
