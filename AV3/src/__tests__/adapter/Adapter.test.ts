import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import AdaptadorArmazenamento from "../../adapter/armazenamento/AdaptadorArmazenamento";
import AdaptadorGoogleCloud from "../../adapter/armazenamento/AdaptadorGoogleCloud";
import AdaptadorLocal from "../../adapter/armazenamento/AdaptadorLocal";
import AdaptadorS3 from "../../adapter/armazenamento/AdaptadorS3";
import SimuladorLocal from "../../adapter/armazenamento/simuladores/SimuladorLocal";
import AdaptadorPagamento from "../../adapter/pagamento/AdaptadorPagamento";
import AdaptadorPagSeguro from "../../adapter/pagamento/AdaptadorPagSeguro";
import AdaptadorPayPal from "../../adapter/pagamento/AdaptadorPayPal";
import AdaptadorStripe from "../../adapter/pagamento/AdaptadorStripe";
import SimuladorStripe from "../../adapter/pagamento/simuladores/SimuladorStripe";
import AdaptadorInterno from "../../adapter/profissional/AdaptadorInterno";
import AdaptadorLinkedIn from "../../adapter/profissional/AdaptadorLinkedIn";
import AdaptadorProfissional from "../../adapter/profissional/AdaptadorProfissional";
import { Papel } from "../../Equipe/Enum/papel";
import { ErroNegocio, ErroServicoIndisponivel, ErroValidacao } from "../../erros";
import { novaAvaliacao, novoProfissional, novoProjeto } from "../../helpers/factories";
import SistemaRecomendacao from "../../SistemaRecomendacao/SistemaRecomendacao";
import SimiliaridadeCosseno from "../../Strategy/SimiliaridadedeCosseno";

beforeEach(() => { jest.spyOn(console, "log").mockImplementation(() => {}); });
afterEach(() => jest.restoreAllMocks());

describe("Adapter: armazenamento (contrato único, provedores intercambiáveis)", () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), "cine-test-"));
  afterAll(() => fs.rmSync(pasta, { recursive: true, force: true }));
  const provedores: Array<[string, () => AdaptadorArmazenamento]> = [
    ["S3", () => new AdaptadorS3()],
    ["Google Cloud", () => new AdaptadorGoogleCloud()],
    ["Local", () => new AdaptadorLocal(new SimuladorLocal(fs.mkdtempSync(path.join(pasta, "r-"))))],
  ];

  it.each(provedores)("%s: salva, recupera e lista", (_n, criar) => {
    const a = criar();
    const id = a.salvarArquivo(Buffer.from("roteiro v1"), { pasta: "projetos/1", nome: "roteiro.txt" });
    expect(id).toBe("projetos/1/roteiro.txt");
    expect(a.recuperarArquivo(id).toString()).toBe("roteiro v1");
    a.salvarArquivo(Buffer.from("x"), { pasta: "projetos/2", nome: "outro.txt" });
    expect(a.listarArquivos("projetos/1/")).toEqual(["projetos/1/roteiro.txt"]);
    expect(a.listarArquivos("projetos/")).toHaveLength(2);
  });

  it.each(provedores)("%s: gera id quando não há nome e rejeita arquivo inexistente", (_n, criar) => {
    const a = criar();
    const id = a.salvarArquivo(Buffer.from("a"), {});
    expect(a.recuperarArquivo(id).toString()).toBe("a");
    expect(() => a.recuperarArquivo("nao/existe")).toThrow(ErroNegocio);
  });

  it("Local: impede sair da pasta com '..' (também com barras do Windows)", () => {
    const a = new AdaptadorLocal(new SimuladorLocal(fs.mkdtempSync(path.join(pasta, "s-"))));
    const id = a.salvarArquivo(Buffer.from("a"), { pasta: "..\\..", nome: "../fuga.txt" });
    expect(id).toBe("fuga.txt");
    expect(() => new SimuladorLocal(pasta).download("../fora")).toThrow(ErroNegocio);
  });
});

describe("Adapter: pagamento", () => {
  const provedores: Array<[string, () => AdaptadorPagamento]> = [
    ["Stripe", () => new AdaptadorStripe()], ["PagSeguro", () => new AdaptadorPagSeguro()], ["PayPal", () => new AdaptadorPayPal()],
  ];

  it.each(provedores)("%s: mesmo vocabulário de status, cancelamento e validações", (_n, criar) => {
    const a = criar();
    const id = a.efetuarPagamento(150, "produtor", "prof-1");
    expect(a.verificarPagamento(id)).toBe("APROVADO");
    expect(a.cancelarPagamento(id)).toBe(true);
    expect(a.verificarPagamento(id)).toBe("CANCELADO");
    expect(a.cancelarPagamento(id)).toBe(false);
    expect(() => a.efetuarPagamento(0, "a", "b")).toThrow(ErroValidacao);
    expect(() => a.efetuarPagamento(10, "", "b")).toThrow(ErroValidacao);
    expect(() => a.verificarPagamento("inexistente")).toThrow(ErroNegocio);
  });

  it("Stripe traduz reais para centavos no gateway, sem vazar isso ao negócio", () => {
    const gateway = new SimuladorStripe();
    const id = new AdaptadorStripe(gateway).efetuarPagamento(12.5, "a", "b");
    expect(gateway.consultarStatus(id)).toBe("succeeded");
    expect(gateway.processarPagamento(12.5, {}).valor).toBe(1250);
  });

  it("status desconhecido do provedor vira DESCONHECIDO", () => {
    const gateway = { processarPagamento: jest.fn(), estornarPagamento: jest.fn(), consultarStatus: () => "???" };
    expect(new AdaptadorStripe(gateway as any).verificarPagamento("x")).toBe("DESCONHECIDO");
  });
});

describe("Adapter: fontes de profissionais", () => {
  it.each<[string, AdaptadorProfissional]>([["LinkedIn", new AdaptadorLinkedIn()], ["Interno", new AdaptadorInterno()]])(
    "%s: converte registros brutos em Profissional", (_n, a) => {
      const lista = a.listarProfissionais({});
      expect(lista.length).toBeGreaterThan(0);
      const p = a.detalharProfissional(lista[0].getId());
      expect(p.nome).toBe(lista[0].nome);
      expect(p.competencias[0].nivel).toBeGreaterThan(0);
      expect(p.disponibiliade.inicio).toBeInstanceOf(Date);
      expect(a.listarProfissionais({ competencia: "inexistente" })).toEqual([]);
      expect(() => a.detalharProfissional("xx")).toThrow(ErroNegocio);
    });

  it("registra avaliação (objeto Avaliacao ou nota) e valida a nota", () => {
    const api = new (require("../../adapter/profissional/simuladores/SimuladorInterno").default)();
    const a = new AdaptadorInterno(api);
    a.registrarAvaliacao("in-1", novaAvaliacao(4, Papel.SONOPLASTA));
    a.registrarAvaliacao("in-1", 5);
    expect(api.notasDe("in-1")).toEqual([4, 5]);
    expect(() => a.registrarAvaliacao("in-1", 9)).toThrow(ErroValidacao);
    expect(() => a.registrarAvaliacao("in-1", {})).toThrow(ErroValidacao);
  });
});

describe("SistemaRecomendacao com adaptadores injetados", () => {
  const projeto = () => novoProjeto({ id: "7", competenciasPorPapel: { [Papel.DIRETOR]: [{ nome: "Direção", nivel: 5 } as any] } });
  const novoSistema = () => { const s = new SistemaRecomendacao([]); s.definirEstrategia(new SimiliaridadeCosseno()); return s; };

  it("recomenda com a fonte de profissionais configurada e a troca sem mudar o sistema", () => {
    const sistema = novoSistema();
    sistema.configurarAdaptadores(undefined, undefined, new AdaptadorLinkedIn());
    expect(sistema.executarRecomendacao(projeto()).membrosEquipe[0].profissional.getId()).toBe("li-1");
    sistema.configurarAdaptadores(undefined, undefined, new AdaptadorInterno());
    expect(sistema.executarRecomendacao(projeto()).membrosEquipe[0].profissional.getId()).toBe("in-2");
  });

  it("troca de provedor de armazenamento mantém o mesmo comportamento de negócio", () => {
    const sistema = novoSistema();
    const p = projeto();
    for (const a of [new AdaptadorS3(), new AdaptadorGoogleCloud()]) {
      sistema.configurarAdaptadores(a);
      const id = sistema.salvarMidia(p, "storyboard.pdf", Buffer.from("pdf"));
      expect(id).toBe("projetos/7/storyboard.pdf");
      expect(sistema.recuperarMidia(id).toString()).toBe("pdf");
      expect(sistema.listarMidias(p)).toEqual([id]);
    }
  });

  it("troca de gateway de pagamento mantém o mesmo comportamento de negócio", () => {
    const sistema = novoSistema();
    const equipe = new SistemaRecomendacao([]);
    equipe.definirEstrategia({ recomendar: () => new Map([[Papel.DIRETOR, novoProfissional({ id: "1", nome: "Ana", precoMedio: 500 })]]) });
    const p = projeto();
    const e = equipe.executarEstrategia(p, [novoProfissional({ id: "1", nome: "Ana", precoMedio: 500 })]);
    const gateways = [new AdaptadorStripe(), new AdaptadorPagSeguro(), new AdaptadorPayPal()];
    for (const g of gateways) {
      sistema.configurarAdaptadores(undefined, g);
      const recibos = sistema.pagarEquipe(p, e, "produtor");
      expect(g.verificarPagamento(recibos.get(Papel.DIRETOR)!)).toBe("APROVADO");
    }
  });

  it("sem adaptador configurado falha com erro claro", () => {
    const sistema = novoSistema();
    expect(() => sistema.executarRecomendacao(projeto())).toThrow(ErroServicoIndisponivel);
    expect(() => sistema.salvarMidia(projeto(), "a", Buffer.from(""))).toThrow(ErroServicoIndisponivel);
    expect(() => sistema.pagarEquipe(projeto(), {} as any, "x")).toThrow(ErroServicoIndisponivel);
  });
});
