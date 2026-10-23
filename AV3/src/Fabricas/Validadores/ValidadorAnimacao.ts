import { Papel } from '../../Equipe/Enum/papel'
import ValidadorPorPapeis from './ValidadorPorPapeis'

/** Animação exige direção e efeitos visuais (modelagem/renderização). */
export default class ValidadorAnimacao extends ValidadorPorPapeis{
     protected papeisEssenciais():Papel[]{ return [Papel.DIRETOR,Papel.EFEITOS_VISUAIS] }
}
