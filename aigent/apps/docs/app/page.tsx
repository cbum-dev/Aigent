import Image from "next/image";
import { Button } from "@repo/ui/button";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Aigent Documentation</h1>
          <p style={{ fontSize: '1.2rem', color: '#666' }}>
            The AI-powered SQL Agent for your database.
          </p>
        </div>

        <div style={{ maxWidth: '800px', width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <section style={{ border: '1px solid #eaeaea', padding: '1.5rem', borderRadius: '8px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>🚀 Getting Started</h2>
            <p>
              Aigent connects to your PostgreSQL database and allows you to query data using natural language.
            </p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '1rem', lineHeight: '1.6' }}>
              <li>1. Login to the Dashboard</li>
              <li>2. Navigate to <strong>Connections</strong></li>
              <li>3. Add your Database credentials</li>
              <li>4. Start asking questions in the <strong>Chat</strong></li>
            </ul>
          </section>

          <section style={{ border: '1px solid #eaeaea', padding: '1.5rem', borderRadius: '8px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>✨ New Features</h2>

            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Collapsible Sidebar</h3>
              <p style={{ marginTop: '0.5rem', color: '#444' }}>
                The dashboard now features a tailored sidebar that can be expanded or collapsed to maximize your workspace.
                Focus on your data when you need to, and access navigation when you don't.
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Smart SQL Generation</h3>
              <p style={{ marginTop: '0.5rem', color: '#444' }}>
                Our agent analyzes your schema and generates optimized SQL queries. It automatically visualizes the results
                using interactive charts and tables.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Dark Mode Support</h3>
              <p style={{ marginTop: '0.5rem', color: '#444' }}>
                Seamlessly switch between light and dark themes. The interface adapts instantly to your preference.
              </p>
            </div>
          </section>

          <section style={{ border: '1px solid #eaeaea', padding: '1.5rem', borderRadius: '8px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>🛠 architecture</h2>
            <p>Built with:</p>
            <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginTop: '1rem' }}>
              <li>• Next.js 14 (App Router)</li>
              <li>• TailwindCSS + Shadcn/UI</li>
              <li>• FastAPI Backend</li>
              <li>• LangChain + GPT-4o</li>
            </ul>
          </section>
        </div>

        <div className={styles.ctas} style={{ marginTop: '3rem' }}>
          <a
            className={styles.primary}
            href="http://localhost:3000"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open App
          </a>
          <Button appName="docs" className={styles.secondary}>
            Click me!
          </Button>
        </div>
      </main>

      <footer className={styles.footer}>
        <p>Aigent Systems © 2026</p>
      </footer>
    </div>
  );
}
