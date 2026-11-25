# Painel de Pendências Sertras

Site com login próprio para acompanhar as pendências do Sertras de todos os contratos (128/2024, 063/2026 e 058/2026).

**Como funciona:**

1. **Coletor (Tampermonkey, no seu Chrome):** uma vez por dia, quando a página "Escolha um contrato" do Sertras abre, ele lê os 4 relatórios (Mensal Pessoas, Mensal Empresa, Integração Pessoas e Integração Empresa) de todos os contratos ativos e envia os dados para o painel. Leva cerca de 1 minuto.
2. **Banco (Supabase):** guarda cada leitura diária. Um item que estava na lista e sumiu na leitura seguinte é registrado como **Aprovado** (verde).
3. **Site (Vercel):** as telas do painel. Só entra quem você cadastrar.

Situações no painel:

| Cor | Situação | Status no Sertras |
|---|---|---|
| Laranja | Pendente | Pendente |
| Azul | Pendente Correção | Pendente Correção |
| Cinza | Em análise Sertras | Pendente Sertras / Pendente Sertras Correção |
| Verde | Aprovado | saiu da lista desde a leitura anterior |

Tudo abaixo é feito pelo navegador, sem instalar nada no computador além da extensão Tampermonkey.

---

## PASSO 1: Criar o banco no Supabase (10 min)

1. Entre em https://supabase.com/dashboard e clique em **New project**.
2. Em **Name**, coloque `painel-sertras`. Crie uma senha do banco, anote e guarde. Em **Region**, escolha **South America (São Paulo)**. Clique em **Create new project** e espere uns 2 minutos.
3. No menu da esquerda, abra **SQL Editor** e clique em **New query**.
4. Abra o arquivo `supabase/schema.sql` deste projeto, copie **todo** o conteúdo, cole no editor e clique em **Run**. Tem que aparecer "Success. No rows returned".
5. Bloqueie o cadastro aberto: menu **Authentication** > **Sign In / Providers** (ou **Settings**). Desligue **Allow new users to sign up** e clique em **Save**.
6. Crie os usuários: menu **Authentication** > **Users** > botão **Add user** > **Create new user**.
   - Preencha o e-mail e uma senha provisória.
   - Marque **Auto Confirm User**.
   - Clique em **Create user**.
   - Faça isso uma vez para você e uma vez para o seu gerente.
7. Pegue as chaves: menu **Project Settings** (engrenagem) > **API** (ou **API Keys**). Deixe esta aba aberta, porque você vai precisar de 3 informações:
   - **Project URL**
   - **anon public**
   - **service_role**: é secreta, nunca mostre para ninguém

## PASSO 2: Colocar o código no GitHub (5 min)

O código já está no repositório `painel-sertras` da sua conta do GitHub. Se você recebeu um .zip em vez disso:

1. Em https://github.com/new, crie um repositório chamado `painel-sertras`, do tipo **Private**.
2. Clique em **uploading an existing file** e arraste todos os arquivos e pastas de dentro do zip. Fica de fora só a pasta `node_modules`, se existir.
3. Clique em **Commit changes**.

## PASSO 3: Publicar o site no Vercel (5 min)

1. Entre em https://vercel.com/new e clique em **Import** ao lado do repositório `painel-sertras`.
2. Abra **Environment Variables** e adicione estas 4 variáveis, uma por vez (Name e Value):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | o **Project URL** do passo 1.7 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | a chave **anon public** |
| `SUPABASE_SERVICE_ROLE_KEY` | a chave **service_role** |
| `INGEST_TOKEN` | invente um código longo, por exemplo 40 letras e números misturados, e **anote** |

3. Clique em **Deploy** e espere terminar (cerca de 2 minutos).
4. Anote o endereço do site, algo como `https://painel-sertras.vercel.app`.
5. Abra esse endereço e entre com o seu e-mail e senha. Vai aparecer "Ainda não há nenhuma leitura", e isso é o normal neste ponto.

## PASSO 4: Instalar o coletor no Chrome (5 min)

1. Instale a extensão **Tampermonkey** pela Chrome Web Store: https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo
2. Abra `chrome://extensions`, clique em **Detalhes** no Tampermonkey e ligue **Permitir scripts do usuário**.
3. Abra este endereço e clique em **Instalar**:
   https://raw.githubusercontent.com/elyonmendes-netizen/painel-sertras/main/coletor/coletor-sertras.user.js
4. Abra https://gestaodeterceiros.sertras.com/escolha-um-contrato já logado. Na primeira vez, aparece uma janela pedindo o **INGEST_TOKEN**: cole o mesmo código do passo 3.2 e clique em OK. Ele fica guardado no Tampermonkey e não precisa ser colado de novo.
5. Uma caixinha escura aparece no canto inferior direito ("Lendo 1 de 26…"). A leitura leva cerca de 1 minuto. Espere a mensagem "Coleta de hoje concluída".
6. As atualizações do script chegam sozinhas pelo Tampermonkey. Para trocar o token, use o link **trocar token** na caixinha.

**Importante:** enquanto a caixinha mostrar "Lendo…", não use o Sertras em outra aba. O coletor troca o contrato ativo da sua sessão, e um envio seu poderia cair no contrato errado. Quando terminar, escolha normalmente o contrato em que vai trabalhar.

## PASSO 5: Atualização automática todo dia

Uma tarefa agendada no Claude abre o Sertras no seu Chrome todo dia às 07:45, e com isso o coletor roda sozinho. Para funcionar, o computador precisa estar ligado, com o Chrome aberto e logado no Sertras. Se em algum dia não rodar, abra a página "Escolha um contrato" ou clique em **Coletar agora** na caixinha.

O topo do painel mostra a hora da última leitura. Se ela tiver mais de 30 horas, o ponto fica vermelho e aparece "leitura atrasada".

---

## Manutenção

- **Novo usuário:** Supabase > Authentication > Users > Add user (passo 1.6).
- **Tirar acesso de alguém:** Supabase > Authentication > Users > nos 3 pontinhos do usuário > **Delete user**.
- **Senha:** cada pessoa troca a própria em **Trocar senha**, no topo do painel.
- **O código para mudar, ou o token vazou:** troque `INGEST_TOKEN` no Vercel (Settings > Environment Variables), clique em **Redeploy** e troque também no script do Tampermonkey.
- **Histórico:** os totais diários ficam guardados para sempre. A lista detalhada de cada dia fica guardada por 90 dias.
