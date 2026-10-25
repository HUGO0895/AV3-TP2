import PacoteServico from "../../composite/PacoteServico";
import ServicoAtomico from "../../composite/ServicoAtomico";
import { Papel } from "../../Equipe/Enum/papel";
import { ErroValidacao } from "../../erros";
import { novoProjeto } from "../../helpers/factories";

const d = (iso: string) => new Date(iso);
const edicao = () => new ServicoAtomico("Edição", 1000, d("2026-03-01"), Papel.EDITOR);
const mixagem = () => new ServicoAtomico("Mixagem", 500, d("2026-03-10"), Papel.SONOPLASTA);
const cor = () => new ServicoAtomico("Coloração", 700, d("2026-04-01"), Papel.DIRETOR_FOTOGRAFIA);
const vfx = () => new ServicoAtomico("VFX", 2000, d("2026-05-01"), Papel.EFEITOS_VISUAIS);

describe("Composite: ServicoAtomico e PacoteServico", () => {
  it("serviço atômico é folha (custo, prazo, sem subserviços)", () => {
    const s = edicao();
    expect(s.calcularCusto()).toBe(1000);
    expect(s.obterPrazo()).toEqual([d("2026-03-01")]);
    expect(s.listarSubservicos()).toEqual([]);
    expect(s.validar()).toBe(true);
  });

  it("valida atômico: custo negativo, data inválida e papel inválido", () => {
    expect(new ServicoAtomico("x", -1, d("2026-01-01"), Papel.EDITOR).validar()).toBe(false);
    expect(new ServicoAtomico("x", 1, new Date("lixo"), Papel.EDITOR).validar()).toBe(false);
    expect(new ServicoAtomico("x", 1, d("2026-01-01"), "INEXISTENTE" as Papel).validar()).toBe(false);
  });

  it("pacote de um nível soma custos e prazos", () => {
    const p = new PacoteServico("Pós", [edicao(), mixagem()]);
    expect(p.calcularCusto()).toBe(1500);
    expect(p.obterPrazo()).toHaveLength(2);
    expect(p.listarSubservicos()).toHaveLength(2);
    expect(p.profundidade()).toBe(1);
  });

  it("pacote profundo (3 níveis): custo, prazos, atômicos e profundidade recursivos", () => {
    const audio = new PacoteServico("Áudio", [mixagem()]);
    const visual = new PacoteServico("Visual", [cor(), new PacoteServico("Efeitos", [vfx()])]);
    const pos = new PacoteServico("Pós-produção", [edicao(), audio, visual]);
    const raiz = new PacoteServico("Filme", [pos]);
    expect(raiz.calcularCusto()).toBe(1000 + 500 + 700 + 2000);
    expect(raiz.obterPrazo()).toHaveLength(4);
    expect(raiz.atomicos().map((a) => a.nome).sort()).toEqual(["Coloração", "Edição", "Mixagem", "VFX"]);
    expect(raiz.profundidade()).toBe(4);
    expect(raiz.validar()).toBe(true);
  });

  it("adicionar/remover alteram o total", () => {
    const p = new PacoteServico("P");
    const e = edicao();
    p.adicionar(e).adicionar(mixagem());
    expect(p.calcularCusto()).toBe(1500);
    expect(p.remover(e)).toBe(true);
    expect(p.remover(e)).toBe(false);
    expect(p.calcularCusto()).toBe(500);
  });

  it("pacote vazio é inválido; um filho inválido invalida toda a hierarquia", () => {
    expect(new PacoteServico("vazio").validar()).toBe(false);
    const ruim = new ServicoAtomico("x", -5, d("2026-01-01"), Papel.EDITOR);
    expect(new PacoteServico("A", [new PacoteServico("B", [edicao(), ruim])]).validar()).toBe(false);
  });

  it("prazos inconsistentes com o limite do pacote são recusados", () => {
    expect(new PacoteServico("P", [vfx()], d("2026-04-30")).validar()).toBe(false);
    expect(new PacoteServico("P", [vfx()], d("2026-05-01")).validar()).toBe(true);
  });

  it("não permite ciclos", () => {
    const a = new PacoteServico("A", [edicao()]);
    const b = new PacoteServico("B", [a]);
    expect(() => a.adicionar(a)).toThrow(ErroValidacao);
    expect(() => a.adicionar(b)).toThrow(ErroValidacao);
  });
});

describe("Composite integrado ao Projeto", () => {
  const projeto = (orcamento = 100000, prazo = "2026-06-01") => {
    const p = novoProjeto({ orcamento, prazo: d(prazo) });
    p.servicoPrincipal = new PacoteServico("Filme", [edicao(), new PacoteServico("Áudio", [mixagem()])]);
    return p;
  };

  it("calcularCustoTotal delega ao serviço principal (0 sem serviços)", () => {
    expect(projeto().calcularCustoTotal()).toBe(1500);
    expect(novoProjeto({}).calcularCustoTotal()).toBe(0);
  });

  it("validarEstrutura: ok, estoura orçamento, prazo depois do projeto, serviço inválido", () => {
    expect(projeto().validarEstrutura()).toBe(true);
    expect(projeto(1000).validarEstrutura()).toBe(false);
    expect(projeto(100000, "2026-03-05").validarEstrutura()).toBe(false);
    const p = projeto();
    p.servicoPrincipal = new PacoteServico("Vazio");
    expect(p.validarEstrutura()).toBe(false);
    expect(novoProjeto({}).validarEstrutura()).toBe(true);
  });

  it("clonar e aplicarAjustes preservam/permitem trocar a hierarquia", () => {
    const p = projeto();
    expect(p.clonar().calcularCustoTotal()).toBe(1500);
    const outro = p.clonar().aplicarAjustes({ servicoPrincipal: vfx() });
    expect(outro.calcularCustoTotal()).toBe(2000);
    expect(p.calcularCustoTotal()).toBe(1500);
  });
});
