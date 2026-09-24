// Resumos funcionais próprios, conferidos no PDF privado (não contém seus bytes).
export const ARTIFICER_ID = 'artificer-ua-2019';
export const UA_VERSION = 'ua-2019-playtest';
export const UA_HASH = '28a6257a7a04b2578f867fd0d6a7a1a9b05bdc4f42a0f44942bc8cf6f416d3c0';
export const fonteUA = printedPage => ({sourceId:ARTIFICER_ID, sourceTitle:'UA 2019 · Playtest', file:'UA-Artificer2-2019.pdf', rulesVersion:UA_VERSION, printedPage});
const registro = (id,ptBR,en,printedPage,extra={}) => ({id,nome:ptBR,name:{ptBR,en,ptBRStatus:'interface-translation'},source:fonteUA(printedPage),...extra});
export const ARTIFICER_INFO = {
  id:ARTIFICER_ID,name:{ptBR:'Artífice',en:'Artificer'},source:fonteUA(2),dado_vida:8,
  atributo_primario:'Inteligência',atributos_primarios:{lista:['Inteligência'],conector:'e'},
  salvaguardas:['Constituição','Inteligência'],armaduras:['Leve','Média','Escudo'],armas:['Simples','Besta de Mão','Besta Pesada'],
  ferramentas:['Ferramentas de Ladrão','Ferramentas de Funileiro'],
  pericias_opcoes:['Arcanismo','História','Investigação','Medicina','Natureza','Percepção','Prestidigitação'],num_pericias:2,
  conjurador:true,atributo_conjuracao:'Inteligência',tipo_conjuracao:'preparadas',categoria_conjuracao:'meia',
  proficiencias_multiclasse:{armaduras:['Leve','Média','Escudo'],armas:[],pericias:0,ferramentas:['Ferramentas de Ladrão','Ferramentas de Funileiro'],instrumentos:0,salvaguardas:[]}
};
// [infusões conhecidas, itens infundidos, truques, espaços 1–5]; UA p.2.
const linhas = [
 [0,0,2,2,0,0,0,0],[3,2,2,2,0,0,0,0],[3,2,2,3,0,0,0,0],[4,2,2,3,0,0,0,0],
 [4,2,2,4,2,0,0,0],[4,3,2,4,2,0,0,0],[5,3,2,4,3,0,0,0],[5,3,2,4,3,0,0,0],
 [5,3,2,4,3,2,0,0],[5,3,3,4,3,2,0,0],[6,4,3,4,3,3,0,0],[6,4,3,4,3,3,0,0],
 [6,4,3,4,3,3,1,0],[6,4,4,4,3,3,1,0],[7,4,4,4,3,3,2,0],[7,5,4,4,3,3,2,0],
 [7,5,4,4,3,3,3,1],[7,5,4,4,3,3,3,1],[8,5,4,4,3,3,3,2],[8,5,4,4,3,3,3,2]
];
export const PROGRESSAO_UA = linhas.map((r,i)=>({nivel:i+1,pb:2+Math.floor(i/4),infusoes:r[0],itens:r[1],truques:r[2],espacos:r.slice(3),source:fonteUA(2)}));
export const ASI_UA = [4,8,12,16,19];
export const EQUIPAMENTO_UA = {
 source:fonteUA(2),opcoes:[
  {id:'itens',escolhas:[{id:'simple-weapons',quantidade:2,categoria:'simples'},{id:'armor',opcoes:['studded-leather','scale-mail']}],fixos:[{id:'light-crossbow',quantidade:1},{id:'crossbow-bolts',quantidade:20},{id:'thieves-tools',quantidade:1},{id:'dungeoneers-pack',quantidade:1}]},
  {id:'ouro',dados:'5d4',multiplicador:10,moeda:'po',substitui:['classe','antecedente']}
 ]
};
export const CARACTERISTICAS_UA = [
 ['magical-tinkering','Engenhoca Mágica','Magical Tinkering',1,2,'Com ferramentas de ladrão, funileiro ou artesão em mãos, uma ação toca objeto Minúsculo não mágico. Escolha luz plena 1,5 m + penumbra 1,5 m; gravação de até 6 s audível a 3 m ao tocar; odor/som não verbal contínuo a 3 m; ou imagem/texto estático de até 25 palavras. Uma propriedade por objeto, duração indefinida; ação para encerrar ao tocar. Máximo mod. INT (mínimo 1) objetos; exceder encerra o mais antigo.'],
 ['spellcasting','Conjuração','Spellcasting',1,3,'INT: CD 8 + PB + mod. INT; ataque PB + mod. INT. Ferramentas de ladrão ou de artesão com proficiência devem estar em mãos como foco para toda magia da classe. No nível 2, seus itens infundidos também servem. Preparo: máx. 1, mod. INT + metade do nível de Artífice para baixo. Troque preparadas no descanso longo (1 minuto por círculo de cada magia). Rituais exigem etiqueta ritual e preparo. Espaços recuperam no descanso longo; registrar magia não concede espaços. Ao ganhar nível de Artífice, pode trocar um truque.'],
 ['infuse-item','Infundir Item','Infuse Item',2,5,'No fim do descanso longo, toque objetos não mágicos compatíveis. Cada infusão conhecida pode estar em um objeto; cada objeto aceita uma infusão. Sintonização pode ocorrer ao infundir, ou depois pelas regras normais. Dura indefinidamente; termina ao esquecer a infusão, ou mod. INT dias após sua morte (mínimo 1). Exceder itens ativos encerra a infusão mais antiga. Ao ganhar nível de Artífice pode substituir uma infusão conhecida. Escolhas divergentes são preservadas para correção manual.'],
 ['specialist','Especialista Artífice','Artificer Specialist',3,5,'Escolha Alquimista, Arquivista, Artilheiro ou Ferreiro de Batalha. Receba características nos níveis de Artífice 3, 6 e 14; suas magias são sempre preparadas e não consomem a cota.'],
 ['tool-expertise','Especialização em Ferramentas','Tool Expertise',3,5,'Dobre o bônus de proficiência em qualquer teste de atributo que use sua proficiência com uma ferramenta.'],
 ['arcane-armament','Armamento Arcano','Arcane Armament',5,6,'A ação Atacar permite dois ataques, mas pelo menos um deve usar arma mágica. Não acrescenta ataque ao recurso Ataque Extra de outra classe.'],
 ['right-cantrip','O Truque Certo para o Trabalho','The Right Cantrip for the Job',10,6,'Ao terminar descanso curto ou longo, pode substituir um truque de Artífice conhecido por outro da lista.'],
 ['spell-storing-item','Item Armazenador de Magia','Spell-Storing Item',18,6,'Ao terminar descanso longo, toque arma simples/marcial ou item utilizável como foco. Armazene uma magia de Artífice de círculo 1 ou 2 com conjuração de uma ação, mesmo não preparada. Portador usa uma ação e seu mod. INT. Máximo 2 × mod. INT utilizações (mínimo 2); termina ao esgotar ou criar outro item.'],
 ['soul-of-artifice','Alma do Artifício','Soul of Artifice',20,6,'Pode sintonizar até seis itens mágicos. Receba +1 em todas as salvaguardas por item mágico ao qual está atualmente sintonizado.']
].map(([id,pt,en,nivel,pagina,descricao])=>registro(id,pt,en,pagina,{nivel,descricao}));
const feat=(id,pt,en,nivel,page,descricao)=>registro(id,pt,en,page,{nivel,descricao});
export const ESPECIALIZACOES_UA = [
 registro('alchemist','Alquimista','Alchemist',6,{ferramentas:['Suprimentos de Alquimista','Kit de Herbalismo'],fabricacao:'Poções: ¼ do tempo e ½ do custo em ouro.',caracteristicas:[
  feat('alchemist-tools','Ferramentas do Ofício','Tools of the Trade',3,6,'Proficiência e aquisição gratuita de suprimentos de alquimista e kit de herbalismo; fabricação de poções em ¼ do tempo e ½ do custo.'),
  feat('homunculus','Homúnculo Alquímico','Alchemical Homunculus',3,7,'Crie um homúnculo no descanso longo com suprimentos de alquimista, a 1,5 m; outro substitui o anterior. Iniciativa igual, turno após o seu; Esquivar salvo comando por ação bônus para ação do bloco, Disparada, Desengajar ou Ajudar. Consertar cura 2d6 PV. Se morreu há até 1 hora: ação com ferramentas e espaço de círculo ≥1 a 1,5 m restaura todos os PV. Salva Alquímica 3/dia: toque; Flutuação dá voo 3 m por 10 min; Inspiração dá vantagem em máx. mod. INT (mín. 1) testes escolhidos antes/depois da rolagem durante 1 hora; Resiliência dá 2d6 + mod. INT PV temporários.'),
  feat('alchemical-mastery','Maestria Alquímica','Alchemical Mastery',6,7,'Com suprimentos de alquimista como foco, acrescente mod. INT (mín. +1) a uma rolagem de cura, dano ácido ou veneno da magia. Restauração Menor sem espaço: mod. INT vezes/dia (mín. 1), usando esse foco.'),
  feat('chemical-savant','Sábio Químico','Chemical Savant',14,7,'Resistência a ácido e veneno; imunidade à condição envenenado. Restauração Maior sem espaço nem componente material, usando suprimentos de alquimista, 1/descanso longo.')]}),
 registro('archivist','Arquivista','Archivist',8,{ferramentas:['Suprimentos de Calígrafo','Kit de Falsificação'],fabricacao:'Pergaminhos: ¼ do tempo e ½ do custo em ouro.',caracteristicas:[
  feat('archivist-tools','Ferramentas do Ofício','Tools of the Trade',3,8,'Proficiência e aquisição gratuita de suprimentos de calígrafo e kit de falsificação; pergaminhos em ¼ do tempo e ½ do custo.'),
  feat('artificial-mind','Mente Artificial','Artificial Mind',3,8,'No descanso longo com suprimentos de calígrafo, desperte uma mente em objeto Minúsculo não mágico, que se torna foco mágico. Uma nova mente desfaz a anterior. Portando o objeto, ganhe duas perícias do material. Manifestar: ação bônus, presença Minúscula intangível e invulnerável a até 18 m, penumbra 3 m, visão no escuro 18 m; ação para usar sentidos mediante concentração. Ação bônus move 9 m por criaturas, não objetos; encerra a 90 m do objeto ou por dispensa bônus. Conjure do espaço da mente mod. INT vezes/descanso longo (mín. 1). Sobrecarga de Informação: ação, criatura visível por você/mente a 1,5 m da mente; salvaguarda INT contra sua CD evita dano psíquico e vantagem no próximo ataque contra ela até fim de seu próximo turno. Dano 1d8, 2d8 no nível 5, 3d8 no 11, 4d8 no 17 de Artífice. Gaste espaço para +2d8 no círculo 1 e +1d8 por círculo acima.'),
  feat('mind-network','Rede Mental','Mind Network',6,9,'Portando a mente, comunicação telepática bidirecional com portadores de suas infusões, inclusive entre planos. Some mod. INT (mín. +1) ao dano psíquico de magias de Artífice e Sobrecarga de Informação.'),
  feat('pure-information','Informação Pura','Pure Information',14,9,'Ao gastar espaço para aumentar Sobrecarga, alvo faz salvaguarda INT adicional contra sua CD ou fica atordoado até fim de seu próximo turno. Infoportação: ação portando a mente, teleporte ao espaço livre mais próximo da mente manifestada ou de item com sua infusão. 1 uso gratuito/descanso longo; usos adicionais com espaço ≥2.')]}),
 registro('artillerist','Artilheiro','Artillerist',9,{ferramentas:['Ferramentas de Ferreiro','Ferramentas de Entalhador'],fabricacao:'Varinhas: ¼ do tempo e ½ do custo em ouro.',caracteristicas:[
  feat('artillerist-tools','Ferramentas do Ofício','Tools of the Trade',3,9,'Proficiência e ferramentas de ferreiro e entalhador gratuitas; também uma varinha de madeira não mágica. Bastões, cajados e varinhas servem como foco. Fabricar varinhas em ¼ do tempo e ½ do custo.'),
  feat('arcane-turret','Torreta Arcana','Arcane Turret',3,10,'Ação com ferramentas de ferreiro: torreta Média em superfície horizontal livre a 1,5 m. CA 18, PV 5 × nível de Artífice; atributos 10; imune a veneno, psíquico e condições. Consertar cura 2d6. Dura 10 minutos, até 0 PV ou dispensa por ação. Uma gratuita/descanso longo; demais custam espaço ≥1. Ação bônus a até 18 m ativa e move/escala 4,5 m. Lança-chamas: cone 4,5 m, DES contra sua CD, 1d8 fogo/metade, incendeia objetos inflamáveis não vestidos/carregados. Balista de Força: ataque mágico a 36 m, 2d8 força e empurra criatura até 1,5 m. Defensora: ela e criaturas escolhidas a 3 m ganham 1d8 + mod. INT (mín. +1) PV temporários. Detonar: ação a até 18 m destrói torreta; criaturas a 3 m fazem DES, 3d6 força/metade.'),
  feat('wand-prototype','Protótipo de Varinha','Wand Prototype',6,10,'No descanso longo com ferramentas de entalhador, varinha de madeira não mágica recebe um truque da lista de Artífice com tempo de uma ação, conhecido ou não; dois no nível 14. Só você usa, com INT e bônus mod. INT (mín. +1) em qualquer rolagem de dano. Expira no próximo descanso longo.'),
  feat('fortified-position','Posição Fortificada','Fortified Position',14,10,'Você e aliados a 3 m de suas torretas têm meia cobertura. Segunda torreta gratuita por descanso longo, até duas simultâneas; terceira encerra a primeira. Uma ação bônus ativa ambas.')]}),
 registro('battle-smith','Ferreiro de Batalha','Battle Smith',11,{ferramentas:['Ferramentas de Coureiro','Ferramentas de Ferreiro'],fabricacao:'Armaduras mágicas: ¼ do tempo e ½ do custo em ouro.',caracteristicas:[
  feat('battle-smith-tools','Ferramentas do Ofício','Tools of the Trade',3,11,'Proficiência e ferramentas de coureiro e ferreiro gratuitas; armaduras mágicas em ¼ do tempo e ½ do custo.'),
  feat('battle-ready','Pronto para Batalha','Battle Ready',3,11,'Proficiência com armas marciais. Ao atacar com arma mágica, pode usar INT em lugar de FOR/DES no ataque e no dano.'),
  feat('iron-defender','Defensor de Ferro','Iron Defender',3,11,'Construto Médio quadrúpede; iniciativa igual, turno após o seu. Move e reage sozinho; Esquivar salvo comando bônus para ação do bloco, Disparada, Desengajar ou Ajudar. Consertar cura 2d6. Morto há até 1 hora: ação com ferramentas de ferreiro a 1,5 m, espaço ≥1; revive após 1 min com PV cheios. Pode criar substituto no descanso longo com ferramentas, encerrando o anterior. Vigilante: não pode ser surpreendido. Reparar 3/dia: cura a si, construto ou objeto a 1,5 m em 2d8 + PB. Bote Defensivo: reação impõe desvantagem no ataque de criatura visível a 1,5 m contra outro alvo.'),
  feat('arcane-jolt','Impulso Arcano','Arcane Jolt',6,12,'Mordida do defensor conta como mágica. Quando você/defensor acerta com arma mágica, acrescente 2d4 força ou cure 2d4 PV de criatura/objeto visível a 9 m do alvo. Mod. INT usos/descanso longo (mín. 1), no máximo uma vez por turno.'),
  feat('improved-defender','Defensor Aprimorado','Improved Defender',14,12,'Impulso Arcano causa/cura 4d4. Quando defensor usa Bote Defensivo, atacante sofre 1d4 + mod. INT de força.')]}),
];
export const MATERIAIS_MENTE = {animal:['Lidar com Animais','Intuição','Medicina','Percepção','Sobrevivência'],mineral:['Enganação','Intimidação','Atuação','Persuasão'],vegetal:['Arcanismo','História','Investigação','Natureza','Religião']};
export const INFUSOES_UA = [
 ['boots-winding-path','Botas do Caminho Sinuoso','Boots of the Winding Path',4,true,'botas',12,'Ação bônus: teleporte até 4,5 m a espaço livre visível que ocupou neste turno.'],
 ['enhanced-defense','Defesa Aprimorada','Enhanced Defense',2,false,'armadura|escudo',12,'+1 CA enquanto vestir/empunhar; +2 no nível 12 de Artífice.'],
 ['enhanced-wand','Varinha Aprimorada','Enhanced Wand',2,true,'varinha',12,'Empunhando: +1 em ataques mágicos e ignora meia cobertura; +2 no nível 12.'],
 ['enhanced-weapon','Arma Aprimorada','Enhanced Weapon',2,false,'arma',12,'Arma simples/marcial mágica, +1 ataque e dano; +2 no nível 12.'],
 ['many-handed-pouch','Bolsas de Muitas Mãos','Many-Handed Pouch',4,false,'bolsas',13,'2–5 bolsas compartilham espaço de uma bolsa. Funcionam a até 160 km de outra; fora disso ficam vazias e não recebem itens. Ao terminar, conteúdo vai a uma bolsa aleatória.'],
 ['radiant-weapon','Arma Radiante','Radiant Weapon',8,true,'arma',13,'Arma simples/marcial +1 ataque/dano. Ação bônus acende/apaga luz plena 9 m + penumbra 9 m. Reação ao sofrer ataque corpo a corpo: CON contra CD do Artífice ou atacante cego até fim do próximo turno dele; 1/descanso curto ou longo do portador.'],
 ['repeating-shot','Tiro Repetitivo','Repeating Shot',2,true,'municao',13,'Arma simples/marcial com propriedade munição: +1 ataque/dano à distância; ignora recarga, produz munição mágica se não carregada manualmente, que desaparece após acertar/errar.'],
 ['replicate-magic-item','Replicar Item Mágico','Replicate Magic Item',2,false,'replica',13,'Escolha item de uma das três tabelas; pode conhecer esta infusão várias vezes somente para itens diferentes. Consulte a descrição original no DMG para funcionamento e objeto exigido.'],
 ['repulsion-shield','Escudo de Repulsão','Repulsion Shield',8,true,'escudo',14,'+1 CA. Reação ao sofrer ataque corpo a corpo empurra atacante até 4,5 m; 1/descanso curto ou longo do portador.'],
 ['resistant-armor','Armadura Resistente','Resistant Armor',8,true,'armadura',14,'Ao infundir escolha resistência a ácido, frio, fogo, força, elétrico, necrótico, veneno, psíquico, radiante ou trovejante; vale enquanto vestir.'],
 ['returning-weapon','Arma Retornante','Returning Weapon',2,false,'arremesso',14,'Arma simples/marcial com arremesso: +1 ataque/dano, retorna à mão imediatamente após ataque à distância.']
].map(([id,pt,en,nivel,sintonizacao,alvo,page,descricao])=>registro(id,pt,en,page,{nivel,sintonizacao,alvo,descricao}));
const replicas = [
 [0,'Alchemy jug|Jarro de Alquimia|0;Bag of holding|Bolsa de Carga|0;Cap of water breathing|Gorro de Respirar na Água|0;Cloak of the manta ray|Manto da Arraia|0;Goggles of night|Óculos Noturnos|0;Lantern of revealing|Lanterna da Revelação|0;Rope of climbing|Corda de Escalada|0;Sending stones|Pedras de Mensagem|0;Wand of magic detection|Varinha de Detecção de Magia|0;Wand of secrets|Varinha de Segredos|0'],
 [12,'Boots of elvenkind|Botas Élficas|0;Boots of striding and springing|Botas de Caminhar e Saltar|1;Boots of the winterlands|Botas das Terras Invernais|1;Bracers of archery|Braçadeiras de Arquearia|1;Brooch of shielding|Broche do Escudo|1;Cloak of elvenkind|Manto Élfico|1;Cloak of protection|Manto de Proteção|1;Eyes of charming|Olhos de Encantar|1;Eyes of the eagle|Olhos de Águia|1;Gauntlets of ogre power|Manoplas da Força do Ogro|1;Gloves of missile snaring|Luvas de Apanhar Projéteis|1;Gloves of swimming and climbing|Luvas de Nadar e Escalar|1;Gloves of thievery|Luvas de Ladinagem|0;Hat of disguise|Chapéu do Disfarce|1;Headband of intellect|Tiara do Intelecto|1;Helm of telepathy|Elmo da Telepatia|1;Medallion of thoughts|Medalhão de Pensamentos|1;Periapt of wound closure|Periapto de Cicatrização|1;Pipes of haunting|Flauta Assombrada|0;Pipes of the sewers|Flauta dos Esgotos|1;Quiver of Ehlonna|Aljava de Ehlonna|0;Ring of jumping|Anel de Saltar|1;Ring of mind shielding|Anel de Proteção Mental|1;Ring of water walking|Anel de Caminhar na Água|0;Slippers of spider climbing|Chinelos de Escalada de Aranha|1;Winged boots|Botas Aladas|1'],
 [16,'Amulet of health|Amuleto da Saúde|1;Belt of hill giant strength|Cinturão da Força do Gigante das Colinas|1;Boots of levitation|Botas de Levitação|1;Boots of speed|Botas de Velocidade|1;Bracers of defense|Braçadeiras de Defesa|1;Cloak of the bat|Manto do Morcego|1;Dimensional shackles|Algemas Dimensionais|0;Gem of seeing|Gema da Visão|1;Horn of blasting|Chifre Explosivo|0;Ring of free action|Anel de Ação Livre|1;Ring of protection|Anel de Proteção|1;Ring of the ram|Anel do Carneiro|1']
];
export const REPLICAS_UA = replicas.flatMap(([nivel,lista])=>lista.split(';').map(l=>{
 const [en,pt,s]=l.split('|'); const id=en.toLowerCase().replace(/[^a-z0-9]+/g,'-');
 return registro(id,pt,en,nivel===16||['slippers-of-spider-climbing','winged-boots'].includes(id)?14:13,{nivel,sintonizacao:s==='1'});
}));
export const CLASSE_UA = {
 id:ARTIFICER_ID,nome:'Artífice',name:ARTIFICER_INFO.name,source:fonteUA(1),
 tracos_basicos:{'Atributo Primário':'Inteligência','Equipamento Inicial':'Duas armas simples; besta leve e 20 virotes; couro batido ou cota de escamas; ferramentas de ladrão e kit de explorador de masmorras. Alternativa: 5d4 × 10 PO em lugar do equipamento da classe e do antecedente.'},
 tabela_caracteristicas:PROGRESSAO_UA.map(r=>({'Nível':String(r.nivel),'Bônus de Proficiência':`+${r.pb}`,'Truques':String(r.truques),'Magias Preparadas':'INT + metade do nível',classId:ARTIFICER_ID,source:r.source,'Características':[...CARACTERISTICAS_UA.filter(f=>f.nivel===r.nivel).map(f=>f.nome),...(ASI_UA.includes(r.nivel)?['Aumento no Valor de Atributo']:[]),...([6,14].includes(r.nivel)?['Característica de Especialização']:[])].join(', '),...Object.fromEntries(r.espacos.map((q,i)=>[String(i+1),q?String(q):'—']))})),
 caracteristicas:CARACTERISTICAS_UA,
 subclasses:ESPECIALIZACOES_UA.map(s=>({...s,nome:s.id})),
};
