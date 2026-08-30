import puppeteer from 'puppeteer-core';

async function runBrowserValidation() {
  console.log('🚀 Iniciando validação no Google Chrome headless...');
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

    // 2. Auto-cadastro de usuário comum (ROLE_USER)
    console.log('2️⃣ Testando auto-cadastro de novo usuário padrão...');
    const uniqueUser = `usr_${Date.now()}`;
    const uniqueEmail = `${uniqueUser}@workbox.local`;
    const uniquePass = 'SenhaForte123!';

    const tabs = await page.$$('button[role="tab"]');
    await tabs[1].click();
    await page.waitForSelector('#signup-username', { timeout: 3000 });

    await page.type('#signup-username', uniqueUser);
    await page.type('#signup-email', uniqueEmail);
    await page.type('#signup-password', uniquePass);
    await page.type('#signup-confirm-password', uniquePass);

    await page.click('button[type="submit"]');
    await page.waitForSelector('.MuiAlert-standardSuccess', { timeout: 5000 });
    console.log(`   ✅ Usuário comum cadastrado com sucesso.`);

    // 3. Login com usuário comum e verificação dos cards no Dashboard
    console.log(`3️⃣ Testando login e grid de módulos para usuário comum (${uniqueUser})...`);
    await page.type('#password', uniquePass);
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 6000 });
    console.log(`   ✅ Redirecionado para o Hub de Módulos (/dashboard).`);

    // Verificar visibilidade de Finanças e ocultação de Administração
    await page.waitForSelector('.MuiCard-root', { timeout: 3000 });
    const financasExists = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.MuiCard-root'));
      return cards.some((c) => c.textContent?.includes('Finanças'));
    });
    const adminExists = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.MuiCard-root'));
      return cards.some((c) => c.textContent?.includes('Administração'));
    });

    console.log(`   ✅ Card "Finanças" visível: ${financasExists}`);
    console.log(`   ✅ Card "Administração" oculto para usuário comum: ${!adminExists}`);

    if (!financasExists || adminExists) {
      throw new Error('Falha na filtragem de papéis no Dashboard para usuário comum!');
    }

    // 4. Testar navegação para o módulo de Finanças (/financas)
    console.log('4️⃣ Testando clique no card Finanças e navegação para /financas...');
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.MuiCardActionArea-root'));
      const financasCard = cards.find((c) => c.textContent?.includes('Finanças'));
      financasCard?.click();
    });

    await page.waitForFunction(() => window.location.pathname === '/financas', { timeout: 5000 });
    const financasHeader = await page.$eval('h5', (el) => el.textContent);
    console.log(`   ✅ Módulo Finanças renderizado: "${financasHeader}"`);

    // Voltar para o Dashboard
    const voltarBtn = await page.waitForSelector('button ::-p-text(Voltar aos Módulos)', { timeout: 3000 });
    await voltarBtn.click();
    await page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 5000 });
    console.log(`   ✅ Retorno ao /dashboard concluído.`);

    // Logout
    const logoutUserBtn = await page.waitForSelector('button ::-p-text(Sair)', { timeout: 3000 });
    await logoutUserBtn.click();
    await page.waitForFunction(() => window.location.pathname === '/', { timeout: 5000 });
    console.log(`   ✅ Logout de usuário comum efetuado.`);

    // 5. Testar login com Administrador (admin / admin)
    console.log('5️⃣ Testando login com Administrador ("admin") e visualização de 12 cards...');
    await page.$eval('#username', (el) => {
      el.focus();
      el.value = '';
    });
    await page.type('#username', 'admin');

    await page.$eval('#password', (el) => {
      el.focus();
      el.value = '';
    });
    await page.type('#password', 'admin');
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 6000 });

    // Verificar se Administração está visível e total de 12 cards
    await page.waitForSelector('.MuiCard-root', { timeout: 3000 });
    const totalCardsAdmin = await page.$$eval('.MuiCard-root', (cards) => cards.length);
    const adminCardVisible = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.MuiCard-root'));
      return cards.some((c) => c.textContent?.includes('Administração'));
    });

    console.log(`   ✅ Total de cards para Administrador: ${totalCardsAdmin} (esperado 12)`);
    console.log(`   ✅ Card "Administração" visível para admin: ${adminCardVisible}`);

    if (totalCardsAdmin !== 12 || !adminCardVisible) {
      throw new Error(`Total de cards incorreto para admin: ${totalCardsAdmin}`);
    }

    // 6. Testar navegação para /admin
    console.log('6️⃣ Testando clique no card Administração e navegação para /admin...');
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.MuiCardActionArea-root'));
      const adminCard = cards.find((c) => c.textContent?.includes('Administração'));
      adminCard?.click();
    });

    await page.waitForFunction(() => window.location.pathname === '/admin', { timeout: 5000 });
    const adminHeader = await page.$eval('h5', (el) => el.textContent);
    console.log(`   ✅ Painel de Administração renderizado: "${adminHeader}"`);

    // Voltar para o Dashboard e deslogar
    const voltarAdminBtn = await page.waitForSelector('button ::-p-text(Voltar aos Módulos)', { timeout: 3000 });
    await voltarAdminBtn.click();
    await page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 5000 });

    const logoutAdminBtn = await page.waitForSelector('button ::-p-text(Sair)', { timeout: 3000 });
    await logoutAdminBtn.click();
    await page.waitForFunction(() => window.location.pathname === '/', { timeout: 5000 });
    console.log(`   ✅ Logout final realizado com sucesso.`);

    console.log('\n🎉 TODAS AS VALIDAÇÕES DE CARDS, ROLES E NAVEGAÇÃO PASSARAM COM SUCESSO!');
  } catch (error) {
    console.error('❌ Erro durante a validação no navegador:', error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runBrowserValidation();
