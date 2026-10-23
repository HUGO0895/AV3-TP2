import Equipe from "./equipe";
import Projeto from '../../Projetos/Modelo/projetos';
import Profissional from "./Profissional";
import { Papel } from "../Enum/papel";
import RecomendacaoStrategy from "../../Strategy/RecomendacaoStrategy"
import { ErroNegocio } from "../../erros";
import FabricaProjeto from "../../Fabricas/FabricaProjeto";
import { logEstruturado } from "../../logger";

/**
 * Template Method: `orquestrar` define o esqueleto fixo do processo e delega
 * às subclasses as etapas variáveis (validar, normalizar, pós-processar).
 */
export default abstract class OrquestradorEquipe{
       /**
        * Abstract Factory: o orquestrador não conhece tipos de projeto. Tudo o que varia
        * por tipo (recomendador, validador) vem da fábrica recebida aqui.
        */
       constructor(protected readonly fabrica:FabricaProjeto){
            // O esqueleto é imutável: subclasses não podem sobrescrever orquestrar().
            if (this.orquestrar !== OrquestradorEquipe.prototype.orquestrar){
                 throw new Error("orquestrar() é o esqueleto do Template Method e não pode ser sobrescrito")
            }
       }

       /** `validarTipo=false` é usado só na rodada parcial de substituição, que não forma uma equipe completa. */
       orquestrar(projeto:Projeto,estrategia:RecomendacaoStrategy,profissionais:Array<Profissional>,validarTipo:boolean=true):Equipe{
                  if (!this.validarRestricoes(projeto)){
                     throw new ErroNegocio("O projeto não possui competencias definidas ou orçamento positivo")
                  }
                  const candidatos=this.filtrarDisponiveis(projeto,profissionais)
                  const recomendador=this.fabrica.criarRecomendador(estrategia)
                  const recomendacoes=recomendador.recomendar(projeto,candidatos)
                  if (recomendacoes.size===0){
                     throw new ErroNegocio("Nenhum profissional elegível para os papéis do projeto (verifique orçamento e prazo)")
                  }
                  const equipe=this.normalizarDados(recomendacoes)
                  if(validarTipo) this.concluir(equipe,projeto)
                  else this.posProcessar(equipe,projeto)
                  return equipe
       }

       /** Pós-processamento + validação de consistência do tipo (também usado ao substituir membros). */
       concluir(equipe:Equipe,projeto:Projeto):void{
            this.posProcessar(equipe,projeto)
            this.validarConsistencia(equipe,projeto)
       }

       /**
        * Visitor da fábrica: se a equipe parecia boa mas viola regra do tipo
        * (ex.: documentário sem editor), o status vira 'inconsistente'.
        * Valida um clone do projeto para não alterar o original.
        */
       private validarConsistencia(equipe:Equipe,projeto:Projeto):void{
            if(equipe.status!=='formada') return
            const candidato=projeto.clonar()
            candidato.equipe=equipe
            if(!candidato.aceitar(this.fabrica.criarValidador())){
                 equipe.status='inconsistente'
                 logEstruturado("warn","equipe_inconsistente",{tipo:projeto.tipo,fabrica:this.fabrica.constructor.name})
            }
       }

       /** Retorna true quando o projeto é válido para orquestração. */
       abstract validarRestricoes(projeto:Projeto):boolean;

       abstract normalizarDados(profissionais:Map<Papel,Profissional>):Equipe;

       abstract posProcessar(recomendacao:Equipe,projeto?:Projeto):void;

       /** Passo concreto (pode ser sobrescrito): mantém quem está disponível na data do prazo. */
       filtrarDisponiveis(projeto:Projeto,profissionais:Array<Profissional>):Array<Profissional>{
            return profissionais.filter((p)=>p.disponibiliade.inicio<=projeto.prazo && p.disponibiliade.final>=projeto.prazo)
       }
}
