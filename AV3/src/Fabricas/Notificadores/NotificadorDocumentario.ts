import EventoRecomendacao from '../../Observer/EventoRecomendacao'
import NotificadorEspecializado from './NotificadorEspecializado'

export default class NotificadorDocumentario extends NotificadorEspecializado{
     protected readonly rotulo='NOTIFICADOR-DOCUMENTARIO'
     protected mensagem(evento:EventoRecomendacao):string{
          return `[Documentário] ${evento.tipo}: avise a produção para agendar as entrevistas com a equipe formada`
     }
}
