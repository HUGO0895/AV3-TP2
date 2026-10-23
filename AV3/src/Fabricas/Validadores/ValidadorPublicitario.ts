import { Papel } from '../../Equipe/Enum/papel'
import ValidadorPorPapeis from './ValidadorPorPapeis'

/** Publicitário exige direção e direção de fotografia (a imagem é o produto). */
export default class ValidadorPublicitario extends ValidadorPorPapeis{
     protected papeisEssenciais():Papel[]{ return [Papel.DIRETOR,Papel.DIRETOR_FOTOGRAFIA] }
}
