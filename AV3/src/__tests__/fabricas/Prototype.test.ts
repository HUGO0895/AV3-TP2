import { Papel } from "../../Equipe/Enum/papel";
import Equipe from "../../Equipe/Modelo/equipe";
import MembroEquipe from "../../Equipe/Modelo/membroEquipe";
import { novaCompetencia, novoProfissional } from "../../helpers/factories";
import { Genero } from "../../Projetos/Enum/TipoGenero";
import { TipoProjeto } from "../../Projetos/Enum/TipoProjeto";
import Projeto from "../../Projetos/Modelo/projetos";
import ProjetoAnimacao from "../../Projetos/Modelo/ProjetoAnimacao";
import ProjetoDocumentario from "../../Projetos/Modelo/ProjetoDocumentario";
import ProjetoPublicitario from "../../Projetos/Modelo/ProjetoPublicitario";
import RegistroPrototipos from "../../Projetos/Modelo/RegistroPrototipos";
import { ErroNegocio } from "../../erros";

const prazo = new Date("2026-06-01");
const competencias = () => new Map([[Papel.DIRETOR, [novaCompetencia("Direção", 5)]]]);
const pesos = () => new Map([[Papel.DIRETOR, 2]]);
const equipe = () => new Equipe(new Date("2026-01-01"), "formada",
  [new MembroEquipe(Papel.DIRETOR, true, novoProfissional({ id: "1", nome: "Ana" }))]);

const documentario = () => new ProjetoDocumentario("d1", Genero.DRAMA, 60, 1000, prazo, competencias(), equipe(), "similiaridadecosseno", pesos(), "Rios", ["Ana", "Beto"]);
const animacao = () => new ProjetoAnimacao("a1", Genero.COMEDIA, 20, 2000, prazo, competencias(), equipe(), undefined, pesos(), "3D", 12);
const publicitario = () => new ProjetoPublicitario("p1", Genero.ACAO, 1, 3000, prazo, competencias(), equipe(), undefined, pesos(), "Marca X", ["TV"]);

describe("Prototype: Projeto.clonar()", () => {
  it.each([
    ["documentário", documentario, ProjetoDocumentario, TipoProjeto.DOCUMENTARIO],
    ["animação", animacao, ProjetoAnimacao, TipoProjeto.ANIMACAO],
    ["publicitário", publicitario, ProjetoPublicitario, TipoProjeto.PUBLICITARIO],
  ] as const)("clone de %s mantém a classe concreta, o tipo e os valores", (_n, criar, Classe, tipo) => {
    const original = criar();
    const copia = original.clonar();
    expect(copia).toBeInstanceOf(Classe);
    expect(copia).not.toBe(original);
    expect(copia.tipo).toBe(tipo);
    expect(copia.getId()).toBe(original.getId());
    expect(copia).toEqual(original);
  });

  it("é cópia profunda: competências, pesos e equipe não são compartilhados", () => {
    const original = documentario();
    const copia = original.clonar() as ProjetoDocumentario;

    copia.competencias!.get(Papel.DIRETOR)![0].nivel = 1;
    copia.competencias!.get(Papel.DIRETOR)!.push(novaCompetencia("Roteiro", 3));
    copia.competencias!.set(Papel.EDITOR, []);
    copia.pesos!.set(Papel.DIRETOR, 99);
    copia.equipe!.membrosEquipe[0].confirmado = false;
    copia.equipe!.membrosEquipe.push(new MembroEquipe(Papel.EDITOR, false, novoProfissional({ id: "2", nome: "Bia" })));
    copia.entrevistados.push("Carla");
    copia.prazo.setFullYear(2030);

    expect(original.competencias!.get(Papel.DIRETOR)![0].nivel).toBe(5);
    expect(original.competencias!.get(Papel.DIRETOR)).toHaveLength(1);
    expect(original.competencias!.has(Papel.EDITOR)).toBe(false);
    expect(original.pesos!.get(Papel.DIRETOR)).toBe(2);
    expect(original.equipe!.membrosEquipe).toHaveLength(1);
    expect(original.equipe!.membrosEquipe[0].confirmado).toBe(true);
    expect(original.entrevistados).toEqual(["Ana", "Beto"]);
    expect(original.prazo.getFullYear()).toBe(2026);
  });

  it("clone do tipo genérico (Projeto) também é independente", () => {
    const original = new Projeto("g", Genero.DRAMA, 90, 100, prazo, TipoProjeto.FICCAO, competencias());
    const copia = original.clonar();
    copia.competencias!.get(Papel.DIRETOR)![0].nivel = 1;
    expect(original.competencias!.get(Papel.DIRETOR)![0].nivel).toBe(5);
    expect(copia.equipe).toBeUndefined();
  });
});

describe("RegistroPrototipos", () => {
  const registro = () => new RegistroPrototipos().registrar("doc-curto", documentario()).registrar("anim", animacao());

  it("cria novas instâncias por clonagem com ajustes finos, sem alterar o modelo", () => {
    const r = registro();
    const novo = r.criar("doc-curto", { id: "novo", orcamento: 5000, detalhes: { tema: "Mar", entrevistados: ["Zé"] } }) as ProjetoDocumentario;
    expect(novo).toBeInstanceOf(ProjetoDocumentario);
    expect(novo.getId()).toBe("novo");
    expect(novo.orcamento).toBe(5000);
    expect(novo.tema).toBe("Mar");
    expect(novo.entrevistados).toEqual(["Zé"]);

    const outro = r.criar("doc-curto") as ProjetoDocumentario;
    expect(outro.getId()).toBe("d1");
    expect(outro.tema).toBe("Rios");
    expect(outro.orcamento).toBe(1000);
  });

  it("guarda cópia do modelo: mudar o original depois não afeta o registro", () => {
    const original = documentario();
    const r = new RegistroPrototipos().registrar("m", original);
    original.orcamento = 1;
    expect(r.criar("m").orcamento).toBe(1000);
  });

  it("ajustes específicos do tipo (animação, publicitário)", () => {
    const a = registro().criar("anim", { detalhes: { tecnica: "2D", cenas: 40 } }) as ProjetoAnimacao;
    expect([a.tecnica, a.cenas]).toEqual(["2D", 40]);
    const p = new RegistroPrototipos().registrar("ad", publicitario()).criar("ad", { detalhes: { cliente: "Y", veiculos: ["Web", "Cinema"] } }) as ProjetoPublicitario;
    expect([p.cliente, p.veiculos]).toEqual(["Y", ["Web", "Cinema"]]);
  });

  it("lista nomes e falha com mensagem clara para protótipo desconhecido", () => {
    const r = registro();
    expect(r.nomes()).toEqual(["doc-curto", "anim"]);
    expect(() => r.criar("xpto")).toThrow(ErroNegocio);
    expect(() => r.criar("xpto")).toThrow("doc-curto");
  });
});
