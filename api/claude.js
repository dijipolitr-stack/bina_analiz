export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: { message: 'API anahtarı sunucuda tanımlı değil.' } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    const body = await req.text();
    const parsed = JSON.parse(body);
    const hasWebSearch = JSON.stringify(parsed.tools || []).includes('web_search');

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        ...(hasWebSearch ? { 'anthropic-beta': 'web-search-2025-03-05' } : {}),
      },
      body,
    });

    const text = await upstream.text();

    // Upstream'den JSON gelmediyse wrap et
    let finalBody;
    try {
      JSON.parse(text);
      finalBody = text;
    } catch {
      finalBody = JSON.stringify({ error: { message: 'Upstream hata: ' + text.substring(0, 300) } });
    }

    return new Response(finalBody, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: { message: 'Proxy hatası: ' + e.message } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
