import axios from "axios";
import { load } from "cheerio";

export async function scrapeAmazonProduct(asin) {
  console.log('entered scrapeAmazonProduct');
  const amazonUrl = `https://www.amazon.com/dp/${asin}`;
  const scraperUrl = `http://api.scraperapi.com?api_key=${process.env.SCRAPER_API_KEY}&url=${amazonUrl}`;

  console.log('scraperUrl', scraperUrl);

  const response = await axios.get(scraperUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    },
  });

  console.log('response', response.data);

  const $ = load(response.data);

  const title =
    $("#productTitle").text().trim() ||
    $("h1.a-size-large").text().trim() ||
    "";

  const bullets = [];
  $("#feature-bullets ul li span.a-list-item").each((i, el) => {
    const text = $(el).text().trim();
    if (text) bullets.push(text);
  });

  let description =
    $("#productDescription").text().trim() ||
    $(".productDescriptionWrapper").text().trim() ||
    "";

  return {
    title: title || "Not found",
    bullets: bullets.length ? bullets : ["No bullet points found"],
    description: description || "Description not found",
  };
}
