import React from 'react';
import Link from 'next/link';
import { Home, Tractor, BarChart3, Settings } from 'lucide-react';
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
          <div className={styles.logoContainer}>
            <Tractor size={32} className={styles.logoIcon} />
            <h2 className={styles.logoText}>Pedra Negra</h2>
          </div>
          <ul className={styles.sidebarMenu}>
            <li>
              <Link href="/dashboard" className={styles.menuLink}>
                <Home size={20} className={styles.menuIcon} />
                <span className={styles.menuText}>Início</span>
              </Link>
            </li>
            <li>
              <Link href="/dashboard/fazendas" className={styles.menuLink}>
                <Tractor size={20} className={styles.menuIcon} />
                <span className={styles.menuText}>Fazendas</span>
              </Link>
            </li>
            <li>
              <Link href="/dashboard/relatorios" className={styles.menuLink}>
                <BarChart3 size={20} className={styles.menuIcon} />
                <span className={styles.menuText}>Relatórios</span>
              </Link>
            </li>
            <li>
              <Link href="/dashboard/configuracoes" className={styles.menuLink}>
                <Settings size={20} className={styles.menuIcon} />
                <span className={styles.menuText}>Configurações</span>
              </Link>
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
