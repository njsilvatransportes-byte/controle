require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const PORT = Number(process.env.PORT) || 3000;
const HOST = '127.0.0.1';
const root = __dirname;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const types = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const hash = password => crypto.scryptSync(password, 'njtransportes', 64).toString('hex');
const json = (response, status, body) => { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); response.end(JSON.stringify(body)); };
const readBody = request => new Promise((resolve, reject) => { let body = ''; request.on('data', chunk => body += chunk); request.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('Dados inválidos.')); } }); });

async function initializeDatabase() {
  await pool.query(`CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS drivers (id UUID PRIMARY KEY, name TEXT NOT NULL, cpf TEXT UNIQUE NOT NULL, cnh TEXT NOT NULL, category TEXT NOT NULL, expiry DATE NOT NULL, status TEXT NOT NULL, phone TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS vehicles (id UUID PRIMARY KEY, plate TEXT UNIQUE NOT NULL, model TEXT NOT NULL, type TEXT NOT NULL, year INTEGER NOT NULL, renavam TEXT, status TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS clients (id UUID PRIMARY KEY, name TEXT NOT NULL, document TEXT, phone TEXT, address TEXT NOT NULL, number TEXT, neighborhood TEXT, city TEXT NOT NULL, state TEXT NOT NULL, zip_code TEXT, reference TEXT, status TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());`);
}
async function api(request, response, url) {
  const method = request.method, route = url.pathname;
  if (route === '/api/auth/register' && method === 'POST') { const { name, email, password } = await readBody(request); if (!name || !email || !password) return json(response, 400, { error: 'Preencha todos os campos.' }); const id = crypto.randomUUID(); try { await pool.query('INSERT INTO users (id, name, email, password_hash) VALUES ($1, $2, $3, $4)', [id, name.trim(), email.trim().toLowerCase(), hash(password)]); return json(response, 201, { id, name: name.trim() }); } catch (error) { return json(response, error.code === '23505' ? 409 : 500, { error: error.code === '23505' ? 'Este e-mail já está cadastrado.' : 'Não foi possível criar a conta.' }); } }
  if (route === '/api/auth/login' && method === 'POST') { const { email, password } = await readBody(request); const result = await pool.query('SELECT id, name, password_hash FROM users WHERE email = $1', [String(email).trim().toLowerCase()]); const user = result.rows[0]; if (!user || user.password_hash !== hash(password || '')) return json(response, 401, { error: 'E-mail ou senha inválidos.' }); return json(response, 200, { id: user.id, name: user.name }); }
  const resource = route.match(/^\/api\/(drivers|vehicles|clients)(?:\/([\w-]+))?$/); if (!resource) return false;
  const [ , table, id ] = resource; const fields = table === 'drivers' ? ['name', 'cpf', 'cnh', 'category', 'expiry', 'status', 'phone'] : table === 'vehicles' ? ['plate', 'model', 'type', 'year', 'renavam', 'status'] : ['name', 'document', 'phone', 'address', 'number', 'neighborhood', 'city', 'state', 'zip_code', 'reference', 'status'];
  if (method === 'GET') { const result = await pool.query(`SELECT * FROM ${table} ORDER BY created_at DESC`); return json(response, 200, result.rows); }
  const data = await readBody(request); if (method === 'POST') { const recordId = crypto.randomUUID(), values = [recordId, ...fields.map(field => data[field] || null)]; try { await pool.query(`INSERT INTO ${table} (id, ${fields.join(', ')}) VALUES ($1, ${fields.map((_, index) => '$' + (index + 2)).join(', ')})`, values); return json(response, 201, { id: recordId, ...data }); } catch (error) { return json(response, error.code === '23505' ? 409 : 500, { error: error.code === '23505' ? 'Já existe um cadastro com este identificador.' : 'Não foi possível salvar.' }); } }
  if (method === 'PUT' && id) { const values = fields.map(field => data[field] || null); await pool.query(`UPDATE ${table} SET ${fields.map((field, index) => `${field} = $${index + 1}`).join(', ')} WHERE id = $${fields.length + 1}`, [...values, id]); return json(response, 200, { id, ...data }); }
  return json(response, 405, { error: 'Método não permitido.' });
}
const server = http.createServer(async (request, response) => { const url = new URL(request.url, `http://${request.headers.host}`); try { if (url.pathname.startsWith('/api/')) { const handled = await api(request, response, url); if (handled === false) json(response, 404, { error: 'Rota não encontrada.' }); return; } const requested = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^[/\\]+/, ''); const file = path.resolve(root, requested); if (!file.startsWith(root + path.sep)) return response.end('Acesso não permitido.'); fs.readFile(file, (error, content) => { if (error) { response.writeHead(404); return response.end('Arquivo não encontrado.'); } response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }); response.end(content); }); } catch (error) { console.error(error); json(response, 500, { error: 'Erro interno do servidor.' }); } });
initializeDatabase().then(() => server.listen(PORT, HOST, () => console.log(`NJTransportes disponível em http://localhost:${PORT}`))).catch(error => { console.error('Não foi possível conectar ao Supabase. Confira DATABASE_URL no arquivo .env.'); console.error(error.message); process.exit(1); });
