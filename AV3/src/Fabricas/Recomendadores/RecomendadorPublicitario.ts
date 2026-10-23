import { Papel } from '../../Equipe/Enum/papel'
import Competencias from '../../Equipe/Modelo/Competencias'
import RecomendadorEspecializado from './RecomendadorEspecializado'

/** Publicitário: fotografia e produção (prazo curto, imagem em primeiro lugar). */
export default class RecomendadorPublicitario extends RecomendadorEspecializado{
     protected prioridades(){
          return {
               [Papel.DIRETOR_FOTOGRAFIA]:[new Competencias(4,'Fotografia')],
               [Papel.DIRETOR]:[new Competencias(3,'Produção')],
          }
     }
}
