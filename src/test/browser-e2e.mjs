import puppeteer from 'puppeteer-core';

async function runBrowserValidation() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1400,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  page.on('console', (msg) => {
    const text = msg.text();
    if (!text.includes('Failed to load resource') && !text.includes('404')) {
      console.log(`[Browser Console ${msg.type()}]:`, text);
    }
  });

  try {
    console.log('🚀 Iniciando validação no Google Chrome headless: Avatar, QR Code MFA, Gestão de Usuários, Papéis e Auditoria...');

    // 1. Navegar para a aplicação
    console.log('1️⃣ Navegando para http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

    const title = await page.title();
    console.log(`   ✅ Título da página renderizado: "${title}"`);

    // 2. Auto-cadastro de novo usuário
    console.log('2️⃣ Testando auto-cadastro de novo usuário...');
    const tabNovoUsuario = await page.waitForSelector('button ::-p-text(Novo Usuário)', { timeout: 5000 });
    await tabNovoUsuario.click();
    await page.waitForSelector('#signup-social-name', { timeout: 5000 });

    const uniqueId = Date.now();
    const testEmail = `cliente_${uniqueId}@workbox.local`;
    const testPassword = 'Password123!';

    await page.type('#signup-social-name', `Cliente Teste ${uniqueId}`);
    await page.type('#signup-email', testEmail);
    await page.type('#signup-password', testPassword);
    await page.type('#signup-confirm-password', testPassword);

    await page.click('#btn-signup-submit');

    // Aguardar mensagem de sucesso e retorno à aba de login
    await page.waitForSelector('.MuiAlert-standardSuccess', { timeout: 5000 });
    console.log(`   ✅ Usuário cadastrado com sucesso.`);

    // 3. Login com o usuário cadastrado
    console.log(`3️⃣ Testando login com E-mail (${testEmail})...`);
    await page.waitForSelector('#email', { timeout: 3000 });
    await page.evaluate((email, password) => {
      const setNativeValue = (element, value) => {
        const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        const prototype = Object.getPrototypeOf(element);
        const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
        if (valueSetter && valueSetter !== prototypeValueSetter) {
          prototypeValueSetter?.call(element, value);
        } else {
          valueSetter?.call(element, value);
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      };

      const emailEl = document.querySelector('#email');
      const passEl = document.querySelector('#password');
      if (emailEl) setNativeValue(emailEl, email);
      if (passEl) setNativeValue(passEl, password);
    }, testEmail, testPassword);

    await page.click('#btn-login-submit');

    try {
      await page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 6000 });
      console.log(`   ✅ Redirecionado para o Hub de Módulos (/dashboard).`);
    } catch (e) {
      const alertText = await page.evaluate(() => document.querySelector('.MuiAlert-message')?.textContent || document.body.innerText);
      console.log('   🔍 Conteúdo na tela após login:', alertText);
      throw e;
    }

    // 4. Testar persistência do botão Perfil no módulo Finanças
    console.log('4️⃣ Testando permanência do botão de Perfil e Sair no módulo Finanças (/financas)...');
    const financasCard = await page.waitForSelector('.MuiCard-root ::-p-text(Finanças)', { timeout: 3000 });
    await financasCard.click();

    await page.waitForFunction(() => window.location.pathname === '/financas', { timeout: 5000 });
    await page.waitForSelector('#btn-perfil', { timeout: 3000 });
    await page.waitForSelector('#btn-logout', { timeout: 3000 });
    console.log(`   ✅ Botões de Perfil e Sair presentes e funcionais na AppBar do módulo Finanças.`);

    // 5. Testar tela de Perfil com upload de foto e MFA
    console.log('5️⃣ Testando navegação para /perfil e controles de foto de perfil...');
    await page.click('#btn-perfil');
    await page.waitForFunction(() => window.location.pathname === '/perfil', { timeout: 5000 });

    await page.waitForSelector('#avatar-file-input', { timeout: 3000 });
    await page.waitForSelector('#btn-salvar-perfil', { timeout: 3000 });
    console.log(`   ✅ Controles de upload e gerenciamento de Avatar renderizados.`);

    // 6. Testar geração de QR Code do MFA
    console.log('6️⃣ Testando clique em "Configurar / Habilitar MFA" e geração de QR Code...');
    const btnHabilitarMfa = await page.waitForSelector('button ::-p-text(Configurar / Habilitar MFA)', { timeout: 3000 });
    await btnHabilitarMfa.click();

    await page.waitForSelector('svg', { timeout: 5000 }); // QRCodeSVG renderizado
    await page.waitForSelector('#mfa-verify-code', { timeout: 3000 });
    console.log(`   ✅ QR Code do Google Authenticator e verificação TOTP gerados com sucesso.`);

    // 7. Testar Logout permanente
    console.log('7️⃣ Testando logout permanente via cabeçalho...');
    await page.click('#btn-logout');
    await page.waitForFunction(() => window.location.pathname === '/', { timeout: 5000 });
    console.log(`   ✅ Logout de usuário efetuado.`);

    // 8. Testar login com Administrador
    console.log('8️⃣ Testando Administrador no Painel de Administração...');
    await page.waitForSelector('#email', { timeout: 3000 });
    await page.evaluate(() => {
      const setNativeValue = (element, value) => {
        const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        const prototype = Object.getPrototypeOf(element);
        const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
        if (valueSetter && valueSetter !== prototypeValueSetter) {
          prototypeValueSetter?.call(element, value);
        } else {
          valueSetter?.call(element, value);
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      };

      const emailEl = document.querySelector('#email');
      const passEl = document.querySelector('#password');
      if (emailEl) setNativeValue(emailEl, 'qa.admin@workbox.local');
      if (passEl) setNativeValue(passEl, 'QaAdmin@123');
    });

    await page.click('#btn-login-submit');

    await page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 6000 });

    const adminCard = await page.waitForSelector('.MuiCard-root ::-p-text(Administração)', { timeout: 4000 });
    await adminCard.click();

    await page.waitForFunction(() => window.location.pathname === '/admin', { timeout: 5000 });
    console.log(`   ✅ Navegado para o Painel de Administração (/admin).`);

    // 9. Testar tela de Gestão de Usuários (/admin/usuarios) e Modal de Auditoria
    console.log('9️⃣ Testando Gestão de Usuários (/admin/usuarios) e Modal de Auditoria...');
    const gestaoCard = await page.waitForSelector('.MuiCard-root ::-p-text(Gestão de Usuários)', { timeout: 3000 });
    await gestaoCard.click();

    await page.waitForFunction(() => window.location.pathname === '/admin/usuarios', { timeout: 5000 });
    await page.waitForSelector('#tabela-usuarios', { timeout: 5000 });
    await page.waitForSelector('#btn-novo-usuario', { timeout: 3000 });
    console.log(`   ✅ Tabela de Usuários carregada.`);

    // Testar abertura do modal de auditoria de usuário
    const auditUserBtn = await page.waitForSelector('button[aria-label="Auditoria do usuário"]', { timeout: 3000 });
    await auditUserBtn.click();
    await page.waitForSelector('.MuiDialog-root', { timeout: 3000 });
    console.log(`   ✅ Modal de Histórico de Auditoria do Usuário aberto com sucesso.`);
    const closeUserAuditBtn = await page.waitForSelector('.MuiDialogActions-root button ::-p-text(Fechar)', { timeout: 3000 });
    await closeUserAuditBtn.click();
    await new Promise((r) => setTimeout(r, 500));

    // Criar um usuário via painel admin
    console.log('   ➕ Criando novo usuário via painel administrativo...');
    await page.click('#btn-novo-usuario');
    await page.waitForSelector('#admin-form-social-name', { timeout: 3000 });

    const adminUniqueId = Date.now();
    const adminCreatedEmail = `admin_created_${adminUniqueId}@workbox.local`;
    await page.evaluate((name, email, pass) => {
      const setNativeValue = (element, value) => {
        const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        const prototype = Object.getPrototypeOf(element);
        const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
        if (valueSetter && valueSetter !== prototypeValueSetter) {
          prototypeValueSetter?.call(element, value);
        } else {
          valueSetter?.call(element, value);
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      };

      const nameEl = document.querySelector('#admin-form-social-name');
      const emailEl = document.querySelector('#admin-form-email');
      const passEl = document.querySelector('#admin-form-password');
      if (nameEl) setNativeValue(nameEl, name);
      if (emailEl) setNativeValue(emailEl, email);
      if (passEl) setNativeValue(passEl, pass);
    }, `Colaborador ${adminUniqueId}`, adminCreatedEmail, 'SenhaAdmin123!');

    await page.click('#btn-salvar-usuario-admin');
    try {
      await page.waitForSelector('.MuiAlert-standardSuccess', { timeout: 6000 });
    } catch (e) {
      const alertText = await page.evaluate(() => document.querySelector('.MuiAlert-message')?.textContent || document.body.innerText);
      console.log('   🔍 Conteúdo/erro na tela após salvar usuário:', alertText);
      throw e;
    }
    await new Promise((r) => setTimeout(r, 500));
    console.log(`   ✅ Novo usuário cadastrado com sucesso pelo Administrador.`);

    // 10. Testar tela de Papéis & Permissões (/admin/papeis) e Modal de Auditoria de Papel
    console.log('🔟 Testando Papéis & Permissões (/admin/papeis) e Modal de Auditoria de Papel...');
    const backBtn1 = await page.waitForSelector('#btn-voltar-dashboard', { timeout: 3000 });
    await backBtn1.click();
    await page.waitForFunction(() => window.location.pathname === '/admin', { timeout: 5000 });

    const papeisCard = await page.waitForSelector('.MuiCard-root ::-p-text(Papéis & Permissões)', { timeout: 5000 });
    await papeisCard.click();

    await page.waitForFunction(() => window.location.pathname === '/admin/papeis', { timeout: 5000 });
    await page.waitForSelector('#tabela-papeis', { timeout: 5000 });
    console.log(`   ✅ Tabela de Papéis & Permissões carregada com sucesso.`);

    // Testar abertura do modal de auditoria de papel
    const auditRoleBtn = await page.waitForSelector('button[aria-label="Auditoria do papel"]', { timeout: 3000 });
    await auditRoleBtn.click();
    await page.waitForSelector('.MuiDialog-root', { timeout: 3000 });
    console.log(`   ✅ Modal de Histórico de Auditoria do Papel aberto com sucesso.`);
    const closeRoleAuditBtn = await page.waitForSelector('.MuiDialogActions-root button ::-p-text(Fechar)', { timeout: 3000 });
    await closeRoleAuditBtn.click();
    await new Promise((r) => setTimeout(r, 500));

    // 11. Testar tela de Auditoria de Logins (/admin/auditoria)
    console.log('1️⃣1️⃣ Testando Auditoria de Logins (/admin/auditoria)...');
    const backBtn2 = await page.waitForSelector('#btn-voltar-dashboard', { timeout: 3000 });
    await backBtn2.click();
    await page.waitForFunction(() => window.location.pathname === '/admin', { timeout: 5000 });

    const auditoriaCard = await page.waitForSelector('.MuiCard-root ::-p-text(Auditoria de Logins)', { timeout: 5000 });
    await auditoriaCard.click();

    await page.waitForFunction(() => window.location.pathname === '/admin/auditoria', { timeout: 5000 });
    await page.waitForSelector('#tabela-auditoria', { timeout: 5000 });
    console.log(`   ✅ Trilha de Auditoria de Logins e monitoramento de segurança carregada com sucesso.`);

    await page.click('#btn-logout');
    await page.waitForFunction(() => window.location.pathname === '/', { timeout: 5000 });
    console.log(`   ✅ Logout final concluído.`);

    console.log('\n🎉 TODAS AS VALIDAÇÕES DE AVATAR, QR CODE MFA, GESTÃO DE USUÁRIOS, PAPÉIS E AUDITORIA PASSARAM COM SUCESSO!');
  } catch (error) {
    console.error('❌ Erro durante a validação no navegador:', error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runBrowserValidation();
