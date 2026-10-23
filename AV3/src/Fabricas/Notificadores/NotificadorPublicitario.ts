import EventoRecomendacao from '../../Observer/EventoRecomendacao'
import NotificadorEspecializado from './NotificadorEspecializado'

export default class NotificadorPublicitario extends NotificadorEspecializado{
     protected readonly rotulo='NOTIFICADOR-PUBLICITARIO'
     protected mensagem(evento:EventoRecomendacao):string{
          return `[Publicitário] ${evento.tipo}: avise a agência para aprovação do cliente`
     }
}
