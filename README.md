# The Jarvis

Assistente pessoal em português do Brasil, inspirado no J.A.R.V.I.S. do Homem de Ferro. Você fala ou digita um pedido em um painel futurista, e ele entende o tipo de pedido, responde com um texto completo e transforma os pontos importantes em cards nos cantos da tela. Nas pesquisas, cada fato vem com uma citação da fonte e o link.

> **Projeto em desenvolvimento.** As etapas 1 a 4 estão prontas. Leitura em voz alta, cálculo e análise jurídica ainda não existem: veja [Estado do projeto](#estado-do-projeto).

## O que já funciona

- **Pedidos por voz:** botão de microfone ou palavra de ativação "Jarvis", com a transcrição ao vivo no terminal.
- **Pedidos por texto:** campo no terminal, com histórico nas setas e atalhos de teclado.
- **Classificação automática:** cada pedido é classificado como pesquisa, cálculo, jurídico, técnico ou conversa, com uma porcentagem de confiança.
- **Conversa com contexto:** continuações como "e o que aconteceu depois?" mantêm o assunto.
- **Pesquisa com provas:** busca na web, citações conferidas no texto das fontes, links e barra de certeza.
- **Troca automática de modelo:** se um modelo do Gemini ficar sem cota ou sobrecarregado, o próximo da lista assume, e o terminal mostra o motivo.

## Requisitos

- Windows, com os comandos abaixo no PowerShell.
- [Node.js](https://nodejs.org) 20 ou mais recente.
- Google Chrome ou Microsoft Edge para usar a voz. O Brave não tem o serviço de voz do Google, mas o campo de texto funciona nele.
- Chave do Gemini, criada no [Google AI Studio](https://aistudio.google.com).
- Chave da Tavily, criada em [app.tavily.com](https://app.tavily.com), para as pesquisas na web.

## Instalação

```powershell
git clone https://github.com/leozinr01/the-jarvis.git
cd the-jarvis
npm install
Copy-Item .env.example .env
notepad .env
```

No arquivo `.env`, preencha as duas chaves:

```env
GEMINI_API_KEY=sua_chave_do_gemini
TAVILY_API_KEY=sua_chave_da_tavily
```

Nunca publique o arquivo `.env`. Ele já está no `.gitignore`.

## Como rodar

```powershell
npm run dev
```

Abra http://localhost:5173 no Chrome ou no Edge. Esse comando sobe o site e o servidor juntos. Para encerrar, aperte `Ctrl+C`.

## Como usar

| Forma | Como funciona |
|---|---|
| **Digitando** | Escreva no campo do terminal e aperte `Enter` |
| **Botão Microfone** | Fale, edite o texto se quiser e aperte `Enter` ou **Enviar** |
| **Botão "Jarvis"** | Ligue o botão e diga "Jarvis, ..."; o pedido é enviado sozinho |

Com o botão "Jarvis" ligado, o microfone fica aberto e o navegador processa o áudio continuamente. Por isso, ele começa desligado.

### Atalhos do campo de texto

| Tecla | Ação |
|---|---|
| `/` | Foca o campo |
| `Enter` | Envia o pedido |
| `Shift+Enter` | Quebra a linha |
| `↑` e `↓` | Navegam pelo histórico de pedidos |
| `Esc` | Limpa o campo |

## Configuração

Variáveis do arquivo `.env`:

| Variável | Obrigatória | Padrão | Para que serve |
|---|---|---|---|
| `GEMINI_API_KEY` | Sim | | Chave do Gemini |
| `TAVILY_API_KEY` | Para pesquisas | | Chave da Tavily |
| `GEMINI_MODELS` | Não | `gemini-3.5-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-3.8-flash` | Modelos em ordem de preferência |
| `GEMINI_TIMEOUT_MS` | Não | `25000` | Tempo limite de cada tentativa, em milissegundos |
| `JARVIS_TRATAMENTO` | Não | `senhor` | Como o Jarvis chama o usuário, como `senhora` |

Depois de alterar o `.env`, reinicie o `npm run dev`.

### O que acontece quando um modelo falha

| Falha | O que o Jarvis faz |
|---|---|
| Sem cota (429) | Passa ao próximo modelo e bloqueia este até a cota renovar |
| Sobrecarga (503) | Passa ao próximo modelo e bloqueia este até a cota renovar |
| Tempo esgotado | Passa ao próximo modelo e bloqueia este por 5 minutos |

A cota diária do Gemini renova à meia-noite do horário do Pacífico, por volta das 4h ou 5h em Brasília. Os bloqueios ficam na memória do servidor, então reiniciá-lo também os limpa.

## Como funcionam os módulos

| Módulo | Situação | O que faz |
|---|---|---|
| **Roteador** | Pronto | Classifica o pedido e, em pesquisas, monta a consulta de busca |
| **Conversa** e **Técnico** | Prontos | Respondem com o Gemini, sem fontes e sem acesso à internet |
| **Pesquisa** | Pronto | Busca na Tavily e responde somente com base nas fontes encontradas |
| **Cálculo** | Pendente | Por enquanto, avisa que ainda não está disponível |
| **Jurídico** | Pendente | Por enquanto, avisa que ainda não está disponível |

### Como as provas da pesquisa são conferidas

1. A Tavily devolve as páginas encontradas e trechos do texto delas.
2. O Gemini escreve a resposta usando somente esses trechos e copia a citação que comprova cada fato.
3. O servidor procura cada citação no texto da fonte e descarta a que não encontrar.
4. Os links vêm da Tavily. O modelo indica apenas o número da fonte, então não consegue inventar uma URL.
5. Se nenhuma citação for confirmada, o texto do modelo não aparece e a certeza fica em 0%.

**Limites:** o servidor confirma que a citação existe na fonte, não que ela sustenta a afirmação, e os parágrafos não são conferidos frase por frase. Em assuntos importantes, abra os links.

A barra de certeza é uma estimativa do modelo, limitada pelo servidor: 0% sem fontes, até 60% com um único site e nunca 100%. Ela não é uma probabilidade medida.

## Privacidade e custos

- **Chaves:** ficam apenas no servidor, que aceita conexões só da própria máquina. Elas nunca vão para o navegador.
- **Pedidos:** o texto vai para o Gemini, e as pesquisas também vão para a Tavily.
- **Voz:** o reconhecimento de voz do navegador pode enviar o áudio a servidores externos.
- **Histórico:** fica na memória e some ao reiniciar o servidor ou recarregar a página.
- **Gemini:** o plano gratuito tem cotas diárias por modelo. Elas podem acabar, e os modelos podem ficar lentos em horários de muita demanda.
- **Tavily:** o plano gratuito tem 1.000 créditos por mês, e cada pesquisa gasta 1.

## Problemas comuns

| Sintoma | O que fazer |
|---|---|
| Aviso de que o Brave não tem voz | Use o Chrome ou o Edge |
| "Permissão do microfone negada" | Libere o microfone no cadeado da barra de endereço |
| "Não consegui falar com o servidor do Jarvis" | Confira se o `npm run dev` está rodando |
| "A chave do Gemini está ausente ou é inválida" | Confira o `GEMINI_API_KEY` no `.env` e reinicie |
| "A chave da Tavily está ausente ou é inválida" | Confira o `TAVILY_API_KEY` no `.env` e reinicie |
| "Nenhum modelo da lista tem cota disponível" | Espere a cota renovar ou mude a lista em `GEMINI_MODELS` |
| Respostas muito lentas | O modelo pode estar sobrecarregado; coloque outro no início de `GEMINI_MODELS` |

## Para desenvolver

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe o site e o servidor |
| `npm test` | Roda os testes, sem chamar as APIs reais |
| `npm run typecheck` | Confere os tipos do TypeScript |
| `npm run build` | Gera a versão de produção do site |

### Estrutura

```text
apps/
  web/       site em React, Vite, Tailwind CSS e Framer Motion
  server/    servidor Fastify, com Gemini, Tavily e os módulos
packages/
  shared/    tipos e validações usados pelo site e pelo servidor
```

## Estado do projeto

- [x] Etapa 1: base do projeto e painel
- [x] Etapa 2: terminal, voz e campo de texto
- [x] Etapa 3: servidor, roteador e conversa
- [x] Etapa 4: pesquisa com fontes, provas, certeza e cards
- [ ] Etapa 5: leitura em voz alta com rolagem sincronizada
- [ ] Etapa 6: módulos de cálculo e jurídico
- [ ] Etapa 7: polimento visual, fundo animado e tratamento de erros

Na fase seguinte, o histórico e a memória devem passar para o Supabase.
