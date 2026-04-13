from fastapi import APIRouter
import requests
from bs4 import BeautifulSoup
from readability import Document

router = APIRouter(prefix="/api/vendor-profile", tags=["Vendor Profile"])

@router.post("/fetch-company-about")
async def fetch_company_about(data: dict):
    url = data.get("url")

    if not url:
        return {"about_company": "", "error": "No URL provided"}

    # 🚫 Block bad sources
    if any(x in url for x in ["youtube.com", "instagram.com", "facebook.com"]):
        return {"about_company": "", "error": "Invalid website"}

    try:
        headers = {"User-Agent": "Mozilla/5.0"}

        # 🔥 STEP 1: Try About page FIRST
        base = url.rstrip("/")
        candidates = [
            base + "/about",
            base + "/about-us",
            base + "/company",
            base
        ]

        best_text = ""

        for link in candidates:
            try:
                res = requests.get(link, timeout=10, headers=headers)
                html = res.text

                soup = BeautifulSoup(html, "html.parser")

                texts = []
                for tag in soup.find_all(["p", "li", "h1", "h2", "h3"]):
                    t = tag.get_text(strip=True)
                    if len(t) > 40:
                        texts.append(t)

                combined = " ".join(texts)

                print("URL:", link)
                print("TEXT LENGTH:", len(combined))

                # 🔥 PRIORITY: ABOUT PAGE
                if "about" in link and len(combined) > 200:
                    return {
                        "about_company": combined[:1200]
                    }

                # 🔥 SAVE BEST CONTENT
                if len(combined) > len(best_text):
                    best_text = combined

            except:
                continue

        # 🔥 USE BEST FOUND
        if best_text:
            return {
                "about_company": best_text[:1200]
            }

        # 🔥 FINAL FALLBACK (NO AI — simple text)
        return {
            "about_company": "This company provides professional services across various industries with a focus on quality and innovation."
        }

    except Exception as e:
        return {
            "about_company": "",
            "error": str(e)
        }