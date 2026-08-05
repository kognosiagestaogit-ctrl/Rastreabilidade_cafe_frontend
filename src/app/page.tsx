'use client';

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/dashboard");
  };

  return (
    <main className={styles.container}>
      {/* Esquerda: Painel de Apresentação e Identidade */}
      <section className={styles.leftPanel}>
        <div className={styles.leftPanelContent}>
          <div className={styles.logoWrapper}>
            <Image
              src="/logoSemFundoCerto.png"
              alt="Logotipo Fazenda Pedra Negra"
              width={200}
              height={200}
              priority
              className={styles.logoImage}
            />
          </div>
          <h1 className={styles.welcomeTitle}>Fazenda<br/>Pedra Negra</h1>
          <p className={styles.welcomeSubtitle}>
            Tradição, herança histórica e excelência em cada detalhe. 
            Acesse o sistema para continuar.
          </p>
        </div>
      </section>

      {/* Direita: Formulário de Autenticação */}
      <section className={styles.rightPanel}>
        <div className={styles.loginBox}>
          <div className={styles.loginHeader}>
            <h2 className={styles.loginTitle}>Bem-vindo</h2>
            <p className={styles.loginSubtitle}>Insira suas credenciais para acessar o portal</p>
          </div>

          <form className={styles.form} onSubmit={handleLogin}>
            <div className={styles.inputWrapper}>
              <input 
                id="email"
                type="email" 
                className={styles.input} 
                placeholder=" "
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
              <label htmlFor="email" className={styles.label}>E-mail de Acesso</label>
            </div>
            
            <div className={styles.inputWrapper}>
              <input 
                id="password"
                type="password" 
                className={styles.input} 
                placeholder=" "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
              <label htmlFor="password" className={styles.label}>Senha</label>
            </div>

            <div className={styles.optionsRow}>
              <label className={styles.checkboxWrapper}>
                <input 
                  type="checkbox" 
                  className={styles.checkbox}
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Lembrar de mim
              </label>
              <a href="#" className={styles.forgotPassword}>Esqueceu a senha?</a>
            </div>

            <button type="submit" className={styles.submitButton}>
              Entrar no Sistema
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
