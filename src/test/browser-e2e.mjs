import puppeteer from 'puppeteer-core';

async function runBrowserValidation() {
  console.log('🚀 Iniciando validação no Google Chrome headless: Avatar, Gestão de Usuários, Papéis e Auditoria...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  page.on('console', (msg) => console.log(`[Browser Console ${msg.type()}]: ${msg.text()}`));
  page.on('pageerror', (err) => console.log(`[Browser Error]: ${err.toString()}`));

  try {
    // 1. Navegar até a aplicação
    console.log('1️⃣ Navegando para http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

    const title = await page.$eval('h1', (el) => el.textContent);
    console.log(`   ✅ Título da página renderizado: "${title}"`);

    // 2. Auto-cadastro de novo usuário com socialName e email
    console.log('2️⃣ Testando auto-cadastro de novo usuário...');
    const uniqueId = Date.now();
    const uniqueSocialName = `Cliente Workbox ${uniqueId}`;
    const uniqueEmail = `cliente_${uniqueId}@workbox.local`;
    const uniquePass = 'SenhaForte123!';

    const tabs = await page.$$('button[role="tab"]');
    await tabs[1].click();
    await page.waitForSelector('#signup-social-name', { timeout: 3000 });

    await page.type('#signup-social-name', uniqueSocialName);
    await page.type('#signup-email', uniqueEmail);
    await page.type('#signup-password', uniquePass);
    await page.type('#signup-confirm-password', uniquePass);

    await page.click('button[type="submit"]');
    await page.waitForSelector('.MuiAlert-standardSuccess', { timeout: 5000 });
    console.log(`   ✅ Usuário cadastrado com sucesso.`);

    // 3. Login com email do usuário comum e verificação do Dashboard
    console.log(`3️⃣ Testando login com E-mail (${uniqueEmail})...`);
    await page.type('#password', uniquePass);
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 6000 });
    console.log(`   ✅ Redirecionado para o Hub de Módulos (/dashboard).`);

    // 4. Testar persistência do botão de perfil e sair no módulo Finanças
    console.log('4️⃣ Testando permanência do botão de Perfil e Sair no módulo Finanças (/financas)...');
    const financasCard = await page.waitForSelector('.MuiCard-root .MuiCardActionArea-root', { timeout: 3000 });
    await financasCard.click();

    await page.waitForFunction(() => window.location.pathname === '/financas', { timeout: 5000 });
    await page.waitForSelector('#btn-perfil', { timeout: 3000 });
    await page.waitForSelector('#btn-logout', { timeout: 3000 });
    console.log(`   ✅ Botões de Perfil e Sair presentes e funcionais na AppBar do módulo Finanças.`);

    // 5. Clicar no botão de Perfil e testar tela de perfil com suporte a Avatar
    console.log('5️⃣ Testando navegação para /perfil e controles de foto de perfil...');
    await page.click('#btn-perfil');
    await page.waitForFunction(() => window.location.pathname === '/perfil', { timeout: 5000 });
    await page.waitForSelector('label[for="avatar-file-input"]', { timeout: 3000 });
    console.log(`   ✅ Controles de upload e gerenciamento de Avatar renderizados.`);

    // 6. Testar início do fluxo de configuração de MFA
    console.log('6️⃣ Testando clique em "Configurar / Habilitar MFA"...');
    await page.waitForSelector('#btn-mfa-enroll', { timeout: 3000 });
    await page.click('#btn-mfa-enroll');

    await page.waitForSelector('#mfa-verify-code', { timeout: 5000 });
    console.log(`   ✅ Chave de segredo MFA e verificação TOTP gerados com sucesso.`);

    // 7. Logout permanente
    console.log('7️⃣ Testando logout permanente via cabeçalho...');
    await page.click('#btn-logout');
    await page.waitForFunction(() => window.location.pathname === '/', { timeout: 5000 });
    console.log(`   ✅ Logout de usuário efetuado.`);

    // 8. Testar login com Administrador
    console.log('8️⃣ Testando Administrador no Painel de Administração...');
    await page.$eval('#email', (el) => {
      el.focus();
      el.value = '';
    });
    await page.type('#email', 'admin@workbox.local');

    await page.$eval('#password', (el) => {
      el.focus();
      el.value = '';
    });
    await page.type('#password', 'admin');
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 6000 });

    const adminCard = await page.waitForSelector('.MuiCard-root .MuiCardActionArea-root', { timeout: 3000 });
    await adminCard.click();

    await page.waitForFunction(() => window.location.pathname === '/admin', { timeout: 5000 });
    console.log(`   ✅ Navegado para o Painel de Administração (/admin).`);

    // 9. Testar tela de Gestão de Usuários (/admin/usuarios)
    console.log('9️⃣ Testando Gestão de Usuários (/admin/usuarios)...');
    const cards = await page.$$('.MuiCard-root .MuiCardActionArea-root');
    await cards[0].click();

    await page.waitForFunction(() => window.location.pathname === '/admin/usuarios', { timeout: 5000 });
    await page.waitForSelector('#tabela-usuarios', { timeout: 5000 });
    await page.waitForSelector('#btn-novo-usuario', { timeout: 3000 });
    console.log(`   ✅ Tabela de Usuários carregada.`);

    // Criar um usuário via painel admin
    console.log('   ➕ Criando novo usuário via painel administrativo...');
    await page.click('#btn-novo-usuario');
    await page.waitForSelector('#admin-form-social-name', { timeout: 3000 });

    const adminCreatedEmail = `admin_created_${uniqueId}@workbox.local`;
    await page.type('#admin-form-social-name', `Colaborador ${uniqueId}`);
    await page.type('#admin-form-email', adminCreatedEmail);
    await page.type('#admin-form-password', 'SenhaAdmin123!');

    await page.click('#btn-salvar-usuario-admin');
    await page.waitForSelector('.MuiAlert-standardSuccess', { timeout: 5000 });
    console.log(`   ✅ Novo usuário cadastrado com sucesso pelo Administrador.`);

    // 10. Testar tela de Papéis & Permissões (/admin/papeis)
    console.log('🔟 Testando Papéis & Permissões (/admin/papeis)...');
    await page.click('#btn-voltar-dashboard');
    await page.waitForFunction(() => window.location.pathname === '/admin', { timeout: 5000 });

    const cardsAdmin = await page.$$('.MuiCard-root .MuiCardActionArea-root');
    await cardsAdmin[1].click();

    await page.waitForFunction(() => window.location.pathname === '/admin/papeis', { timeout: 5000 });
    await page.waitForSelector('#tabela-papeis', { timeout: 5000 });
    console.log(`   ✅ Tabela de Papéis & Permissões carregada com sucesso.`);

    // 11. Testar tela de Auditoria de Logins (/admin/auditoria)
    console.log('1️⃣1️⃣ Testando Auditoria de Logins (/admin/auditoria)...');
    await page.click('#btn-voltar-dashboard');
    await page.waitForFunction(() => window.location.pathname === '/admin', { timeout: 5000 });

    const cardsAdmin2 = await page.$$('.MuiCard-root .MuiCardActionArea-root');
    await cardsAdmin2[2].click();

    await page.waitForFunction(() => window.location.pathname === '/admin/auditoria', { timeout: 5000 });
    await page.waitForSelector('#tabela-auditoria', { timeout: 5000 });
    console.log(`   ✅ Trilha de Auditoria de Logins e monitoramento de segurança carregada com sucesso.`);

    await page.click('#btn-logout');
    await page.waitForFunction(() => window.location.pathname === '/', { timeout: 5000 });
    console.log(`   ✅ Logout final concluído.`);

    console.log('\n🎉 TODAS AS VALIDAÇÕES DE AVATAR, GESTÃO DE USUÁRIOS, PAPÉIS E AUDITORIA PASSARAM COM SUCESSO!');
  } catch (error) {
    console.error('❌ Erro durante a validação no navegador:', error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runBrowserValidation();
