import { Papel } from "../Equipe/Enum/papel";
import Convite from "../Equipe/Modelo/Convite";
import Equipe from "../Equipe/Modelo/equipe";
import MembroEquipe from "../Equipe/Modelo/membroEquipe";
import OrquestradorEquipe from "../Equipe/Modelo/OrquestradorEquipe";
import OrquestradorPadrao from "../Equipe/Modelo/OrquestradorPadrao";
import Profissional from "../Equipe/Modelo/Profissional";
import { ErroNegocio, ErroValidacao } from "../erros";
import AuditoriaRecomendacao from "../Observer/AuditoriaRecomendacao";
import EventoRecomendacao, { TiposEvento } from "../Observer/EventoRecomendacao";
import NotificadorEmail from "../Observer/NotificadorEmail";
import NotificadorInterno from "../Observer/NotificadorInterno";
import Observador from "../Observer/Observador";
import Projeto from "../Projetos/Modelo/projetos";
import RecomendacaoStrategy from "../Strategy/RecomendacaoStrategy";
import FabricaProjeto from "../Fabricas/FabricaProjeto";
import RegistroFabricas from "../Fabricas/RegistroFabricas";

const ORIGEM = "Sistema Recomendação"

export default class SistemaRecomendacao{
    private EstrategiaAtual?:RecomendacaoStrategy

    constructor(
        private Observadores:Array<Observador>=[new NotificadorEmail(),new NotificadorInterno(),new AuditoriaRecomendacao()],
        private registro:RegistroFabricas=RegistroFabricas.padrao(),
        private criarOrquestrador:(fabrica:FabricaProjeto)=>OrquestradorEquipe=(fabrica)=>new OrquestradorPadrao(fabrica)
    ){}

   public definirEstrategiaAtual(estrategia:RecomendacaoStrategy){
             this.EstrategiaAtual=estrategia
   }

   /** Nome do diagrama UML. */
   public definirEstrategia(estrategia:RecomendacaoStrategy){
             this.definirEstrategiaAtual(estrategia)
   }

   /** A estratégia pode ser passada explicitamente (evita estado compartilhado entre requisições). */
   public executarEstrategia(projeto:Projeto,profissionais:Array<Profissional>,estrategia?:RecomendacaoStrategy):Equipe{
     const usada=this.resolverEstrategia(estrategia)
     const fabrica=this.registro.obter(projeto.tipo)
     const equipe=this.criarOrquestrador(fabrica).orquestrar(projeto,usada,profissionais)
     projeto.equipe=equipe
     this.notificar(new EventoRecomendacao(TiposEvento.RECOMENDACAO,equipe,ORIGEM),fabrica)
     return equipe
   }

   /** Troca um papel mantendo os demais fixos: nova rodada só para o papel afetado. */
   public substituirMembro(projeto:Projeto,equipeAtual:Equipe,papel:Papel,profissionais:Array<Profissional>,rejeitados:Array<string>=[],estrategia?:RecomendacaoStrategy):Equipe{
     const usada=this.resolverEstrategia(estrategia)
     const fabrica=this.registro.obter(projeto.tipo)
     const orquestrador=this.criarOrquestrador(fabrica)
     projeto.equipe=equipeAtual
     const atual=equipeAtual.membrosEquipe.find((m)=>m.papel===papel)
     if(!atual) throw new ErroNegocio(`A equipe não possui o papel ${papel}`)
     const anteriorId=atual.profissional.getId()

     const fixos=equipeAtual.membrosEquipe.filter((m)=>m.papel!==papel)
     const excluidos=new Set<string>([...rejeitados,...equipeAtual.membrosEquipe.map((m)=>m.profissional.getId())])
     const orcamentoRestante=projeto.orcamento-fixos.reduce((acu,m)=>acu+m.profissional.precoMedio,0)
     if(orcamentoRestante<=0) throw new ErroNegocio("Orçamento restante insuficiente para substituir o membro")

     const competencias=projeto.competencias?.get(papel)
     // Prototype: o subprojeto é um clone (mantém o tipo e os atributos), só com o papel e o orçamento restantes.
     const subProjeto=projeto.clonar().aplicarAjustes({orcamento:orcamentoRestante,competencias:new Map([[papel,competencias ?? []]])})
     subProjeto.equipe=undefined
     const candidatos=profissionais.filter((p)=>!excluidos.has(p.getId()))

     const parcial=orquestrador.orquestrar(subProjeto,usada,candidatos,false)
     const novo=parcial.membrosEquipe.find((m)=>m.papel===papel)
     if(!novo) throw new ErroNegocio(`Nenhum substituto disponível para ${papel}`)

     projeto.substituirMembro(papel,novo.profissional)
     orquestrador.concluir(equipeAtual,projeto)
     this.notificar(new EventoRecomendacao(TiposEvento.MEMBRO_SUBSTITUIDO,equipeAtual,ORIGEM,{
        papel,anterior:anteriorId,novo:novo.profissional.getId()
     }),fabrica)
     return equipeAtual
   }

   /** Aceite confirma o membro; recusa dispara automaticamente a substituição do papel. */
   public responderConvite(projeto:Projeto,equipeAtual:Equipe,papel:Papel,aceito:boolean,profissionais:Array<Profissional>,rejeitados:Array<string>=[],estrategia?:RecomendacaoStrategy):Equipe{
     const fabrica=this.registro.obter(projeto.tipo)
     projeto.equipe=equipeAtual
     const membro=equipeAtual.membrosEquipe.find((m)=>m.papel===papel)
     if(!membro) throw new ErroNegocio(`A equipe não possui o papel ${papel}`)
     const convite=new Convite(papel,membro.profissional)
     const id=membro.profissional.getId()

     if(!aceito){
        convite.recusar()
        this.notificar(new EventoRecomendacao(TiposEvento.CONVITE_RECUSADO,equipeAtual,ORIGEM,{papel,profissionalId:id}),fabrica)
        return this.substituirMembro(projeto,equipeAtual,papel,profissionais,[...rejeitados,id],estrategia)
     }

     convite.aceitar()
     projeto.aceitarRecomendacao(papel,membro.profissional)
     this.notificar(new EventoRecomendacao(TiposEvento.CONVITE_ACEITO,equipeAtual,ORIGEM,{papel,profissionalId:id}),fabrica)

     const todosConfirmados=equipeAtual.membrosEquipe.every((m:MembroEquipe)=>m.confirmado)
     if(todosConfirmados && equipeAtual.status==='formada'){
        equipeAtual.status='confirmada'
        // Evento consumido por gerência de projetos e processamento financeiro.
        this.notificar(new EventoRecomendacao(TiposEvento.EQUIPE_CONFIRMADA,equipeAtual,ORIGEM,{projetoId:projeto.getId()}),fabrica)
     }
     return equipeAtual
   }

   public adicionarObservador(observador:Observador){
            this.Observadores.push(observador)
   }

   /** Mantido por compatibilidade com o nome original (com erro de digitação). */
   public adicionarObeservador(observador:Observador){
            this.adicionarObservador(observador)
   }

   private resolverEstrategia(estrategia?:RecomendacaoStrategy):RecomendacaoStrategy{
        const usada=estrategia ?? this.EstrategiaAtual
        if(!usada) throw new ErroValidacao("Nenhuma estratégia de recomendação definida")
        return usada
   }

   /** Observadores gerais + o notificador específico do tipo de projeto (vem da fábrica). */
   private notificar(evento:EventoRecomendacao,fabrica:FabricaProjeto){
        for (const x of this.Observadores){
            x.atualizar(evento)
        }
        fabrica.criarNotificador().atualizar(evento)
   }
}
