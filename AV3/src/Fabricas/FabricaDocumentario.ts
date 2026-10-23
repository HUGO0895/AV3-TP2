import Observador from '../Observer/Observador'
import { TipoProjeto } from '../Projetos/Enum/TipoProjeto'
import Projeto from '../Projetos/Modelo/projetos'
import ProjetoDocumentario from '../Projetos/Modelo/ProjetoDocumentario'
import RecomendacaoStrategy from '../Strategy/RecomendacaoStrategy'
import VisitanteProjeto from '../Visitor/VisitanteProjeto'
import FabricaProjeto, { DadosProjeto } from './FabricaProjeto'
import NotificadorDocumentario from './Notificadores/NotificadorDocumentario'
import RecomendadorDocumentario from './Recomendadores/RecomendadorDocumentario'
import ValidadorDocumentario from './Validadores/ValidadorDocumentario'

export default class FabricaDocumentario extends FabricaProjeto{
     readonly tipo=TipoProjeto.DOCUMENTARIO

     criarProjeto(d:DadosProjeto):Projeto{
          return new ProjetoDocumentario(d.id,d.genero,d.duracaoMin,d.orcamento,d.prazo,d.competencias,undefined,d.estrategia,d.pesos)
               .aplicarAjustes({detalhes:d.detalhes})
     }
     criarValidador():VisitanteProjeto{ return new ValidadorDocumentario() }
     criarRecomendador(base?:RecomendacaoStrategy):RecomendacaoStrategy{ return new RecomendadorDocumentario(base) }
     criarNotificador():Observador{ return new NotificadorDocumentario() }
}
