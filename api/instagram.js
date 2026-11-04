/* Latest Instagram posts for the gallery.
   Connect ONE of these in Vercel > Project > Settings > Environment Variables:
   - IG_TOKEN:   Instagram API access token (free, from a Meta developer app)
   - BEHOLD_URL: JSON feed URL from behold.so                                  */
module.exports = async (req, res) => {
  const token = process.env.IG_TOKEN, behold = process.env.BEHOLD_URL;
  try {
    let posts = [];
    if (token) {
      const r = await fetch('https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=14&access_token=' + encodeURIComponent(token));
      const j = await r.json();
      if (!r.ok) throw new Error((j.error && j.error.message) || 'Instagram error');
      posts = (j.data || []).map(p => ({ type: p.media_type, img: p.media_type === 'VIDEO' ? p.thumbnail_url : p.media_url, link: p.permalink, caption: p.caption || '' }));
    } else if (behold) {
      const r = await fetch(behold);
      const j = await r.json();
      const list = Array.isArray(j) ? j : (j.posts || []);
      posts = list.map(p => ({ type: p.mediaType, img: (p.sizes && p.sizes.medium && p.sizes.medium.mediaUrl) || p.thumbnailUrl || p.mediaUrl, link: p.permalink, caption: p.caption || '' }));
    } else {
      res.statusCode = 204; return res.end();
    }
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({ posts: posts.filter(p => p.img && p.link).slice(0, 14) }));
  } catch (e) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: String(e.message || e) }));
  }
};
