import pg from 'pg';

const connectionString = "postgresql://postgres:Yaya%405064%2F12@db.nwcluryensccptkqxsth.supabase.co:5432/postgres";

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log("Connected.");
    await client.query("ALTER PUBLICATION supabase_realtime ADD TABLE matches;");
    console.log("Realtime enabled on matches table.");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
