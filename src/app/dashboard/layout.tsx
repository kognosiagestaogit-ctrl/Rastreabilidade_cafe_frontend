import React from 'react';
import styles from './layout.module.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.container}>
      {/* Menu Lateral */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarContent}>
          <h2>Menu</h2>
          <ul className={styles.sidebarMenu}>
            <li>
              <span className={styles.menuIcon}>🏠</span>
              <span className={styles.menuText}>Início</span>
            </li>
            <li>
              <span className={styles.menuIcon}>📊</span>
              <span className={styles.menuText}>Relatórios</span>
            </li>
            <li>
              <span className={styles.menuIcon}>⚙️</span>
              <span className={styles.menuText}>Configurações</span>
            </li>
            
          </ul>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}
