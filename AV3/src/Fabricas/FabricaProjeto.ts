import { Papel } from '../Equipe/Enum/papel'
import Competencias from '../Equipe/Modelo/Competencias'
import Observador from '../Observer/Observador'
import { Genero } from '../Projetos/Enum/TipoGenero'
import { TipoProjeto } from '../Projetos/Enum/TipoProjeto'
import Projeto from '../Projetos/Modelo/projetos'
import RecomendacaoStrategy from '../Strategy/RecomendacaoStrategy'
import VisitanteProjeto from '../Visitor/VisitanteProjeto'

/** Dados de entrada para criar um projeto (independente do tipo concreto). */
export interface DadosProjeto {
     id:string
     genero:Genero
     duracaoMin:number
     orcamento:number
     prazo:Date
     competencias?:Map<Papel,Array<Competencias>>
     pesos?:Map<Papel,number>
     estrategia?:string
     /** Atributos específicos do tipo (tema, técnica, cliente...). */
     detalhes?:Record<string,unknown>
}

/**
 * Abstract Factory: cada fábrica concreta produz a FAMÍLIA completa de objetos de um tipo
 * de projeto (projeto, validador, recomendador, notificador), que foram feitos para cooperar.
 * Cada método `criar*` é um Factory Method: as subclasses decidem qual classe instanciar.
 */
export default abstract class FabricaProjeto{
     /** Tipo de projeto atendido por esta fábrica (chave do RegistroFabricas). */
     abstract readonly tipo:TipoProjeto

     abstract criarProjeto(dados:DadosProjeto):Projeto
     abstract criarValidador():VisitanteProjeto
     /** `base` é a estratégia escolhida pelo cliente; o recomendador do tipo a especializa. */
     abstract criarRecomendador(base?:RecomendacaoStrategy):RecomendacaoStrategy
     abstract criarNotificador():Observador
}
