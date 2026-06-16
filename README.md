# TrackFlow

🚀 **Sistema Moderno e de Baixo Atrito para Rastreamento de Horas e Produtividade**

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/pt-BR/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/pt-BR/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

---

## 📝 Descrição do Projeto

O **TrackFlow** é um sistema web responsivo projetado com foco em **gestão por confiança** e **alta produtividade**. O principal diferencial do TrackFlow é sua proposta de **fricção zero**: permitindo que profissionais iniciem o rastreamento do seu tempo de forma instantânea, sem a obrigatoriedade de preencher longos formulários antes de começar a trabalhar.

Com uma interface moderna, o sistema ajuda desenvolvedores, freelancers e equipes a documentar suas horas com precisão, gerenciar blocos de foco/pausa e converter registros de tempo em faturas organizadas para os clientes de forma descomplicada.

---

## ⚡ Demonstração em Tempo Real

O projeto está implantado e pronto para uso no Firebase Hosting:

🔗 **Acesse a demonstração online:** [https://trackflow-web.web.app](https://trackflow-web.web.app)

---

## ✨ Funcionalidades Principais

*   ⏱️ **Fricção Zero:** Clique no botão "Play" e comece a rastrear imediatamente. Vínculos a Clientes, Projetos e Tarefas podem ser feitos dinamicamente a qualquer momento durante ou após a execução.
*   🎯 **Gestão de Foco (Pomodoro):** Timer Pomodoro integrado diretamente na interface para facilitar o gerenciamento de ciclos de foco e pausas de descanso programadas.
*   📦 **Gestão Administrativa (CRUD completo):** Cadastro e gerenciamento estruturado de **Clientes**, **Projetos** e **Tarefas**, permitindo a vinculação hierárquica das atividades.
*   💵 **Faturamento e Relatórios:** Geração automática de relatórios de horas trabalhadas e faturamento estimado baseado em taxas horárias personalizáveis por projeto.
*   📊 **Histórico de Faturas (Invoices):** Módulo para fechar faturas mensais por cliente ou projeto e gerenciar o histórico financeiro (Status: Pago, Pendente, Atrasado, etc.).
*   🎨 **Personalização Avançada:** Suporte nativo a temas Claro (*Light Mode*) e Escuro (*Dark Mode*) com alternância rápida baseada em variáveis CSS.
*   📱 **Design Mobile-First:** Interface totalmente otimizada e responsiva, com suporte a gestos e transições otimizadas (GPU) para navegação ágil no celular.

---

## 🛠️ Tecnologias Utilizadas (Tech Stack)

*   **Frontend:** HTML5 (Semântico), CSS3 (Variáveis CSS, Flexbox/Grid e Animações) e Vanilla JavaScript (ES6+ baseado em Módulos).
*   **Serviços Backend (Firebase):**
    *   **Firebase Authentication:** Login com E-mail/Senha e login social integrado do Google.
    *   **Cloud Firestore:** Banco de dados NoSQL em tempo real para armazenamento de usuários, registros de tempo, tarefas, projetos, clientes e configurações.
    *   **Firebase Hosting:** Hospedagem estática segura com SSL global e CDN rápido.

---

## 🚀 Rodando Localmente (Getting Started)

Por ser uma aplicação de página única (SPA) construída com **JavaScript Vanilla**, o TrackFlow não requer etapas complexas de compilação ou empacotamento.

### Pré-requisitos
Certifique-se de ter um servidor web local ou extensão de desenvolvimento instalada. Exemplos recomendados:
*   **VS Code Live Server** (Extensão do Visual Studio Code)
*   **Node.js** com a biblioteca global `http-server`

### Passo a Passo

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/VictorHugoGutierrez/TrackFlow.git
    cd TrackFlow
    ```

2.  **Abra o projeto no seu editor de código:**
    ```bash
    code .
    ```

3.  **Inicie o servidor local:**
    *   Se estiver utilizando a extensão **Live Server** do VS Code, clique em `Go Live` no rodapé do editor.
    *   Ou instale e execute o servidor local via terminal usando Node.js:
        ```bash
        npm install -g http-server
        http-server ./public
        ```

4.  **Acesse no navegador:**
    Abra o link fornecido pelo servidor (geralmente `http://localhost:5500` ou `http://localhost:8080`).

---

## ⚙️ Configuração do Firebase

Para fazer o projeto funcionar com a sua própria base de dados do Firebase, siga estes passos:

1.  Acesse o [Console do Firebase](https://console.firebase.google.com/) e crie um novo projeto.
2.  Ative o **Authentication** e habilite os métodos de login:
    *   E-mail e Senha
    *   Google
3.  Ative o **Cloud Firestore** no modo de produção ou teste.
4.  Registre um aplicativo Web no console do Firebase para obter o objeto de configuração JSON.
5.  Adicione as chaves de acesso no arquivo de configuração do projeto:
    *   Abra o arquivo [public/js/config/firebase.js](file:///d:/Dev/TrackFlow/public/js/config/firebase.js)
    *   Substitua o objeto `firebaseConfig` pelos seus dados de acesso:
    ```javascript
    const firebaseConfig = {
      apiKey: "SUA_API_KEY",
      authDomain: "SEU_AUTH_DOMAIN",
      projectId: "SEU_PROJECT_ID",
      storageBucket: "SEU_STORAGE_BUCKET",
      messagingSenderId: "SEU_MESSAGING_SENDER_ID",
      appId: "SEU_APP_ID",
      measurementId: "SEU_MEASUREMENT_ID"
    };
    ```

---

## 🛡️ Arquitetura e Segurança (Tenant Isolation)

O TrackFlow foi desenhado com foco estrito na privacidade e segurança de dados do usuário. 

*   **Isolamento de Dados (Multi-tenancy lógico):** Cada usuário opera em seu próprio espaço isolado de dados. Todas as consultas, criações e mutações feitas nas coleções do Firestore (`time_entries`, `projects`, `clients`, `tasks`, `invoices` e `user_settings`) filtram e validam dados obrigatoriamente a partir do ID do usuário autenticado no momento (`auth.currentUser.uid`).
*   **Segurança no Banco de Dados:** A filtragem no frontend é reforçada por meio das Regras de Segurança do Cloud Firestore, assegurando que leituras e escritas não autorizadas sejam rejeitadas a nível de servidor.

---

## 🤝 Contribuições

Contribuições de código aberto são super bem-vindas! Siga as diretrizes abaixo para colaborar:

1.  Faça um **Fork** do projeto.
2.  Crie uma branch para a sua funcionalidade (`git checkout -b feature/nova-funcionalidade`).
3.  Faça o commit de suas alterações (`git commit -m 'Adiciona nova funcionalidade'`).
4.  Envie para a branch do repositório remoto (`git push origin feature/nova-funcionalidade`).
5.  Abra um **Pull Request**.

---

## 📄 Licença

Este projeto está licenciado sob a licença MIT - consulte o arquivo [LICENSE](LICENSE) para obter detalhes.
