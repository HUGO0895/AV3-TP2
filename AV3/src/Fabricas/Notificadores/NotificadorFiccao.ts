import EventoRecomendacao from '../../Observer/EventoRecomendacao'
import NotificadorEspecializado from './NotificadorEspecializado'

export default class NotificadorFiccao extends NotificadorEspecializado{
     protected readonly rotulo='NOTIFICADOR-FICCAO'
     protected mensagem(evento:EventoRecomendacao):string{
          return `[Ficção] ${evento.tipo}: equipe pronta para a pré-produção`
     }
}
