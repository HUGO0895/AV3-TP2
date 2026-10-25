import Profissional from "../../Equipe/Modelo/Profissional";

/** Contrato padronizado de fontes de cadastro de profissionais (Adapter: interface alvo). */
export default interface AdaptadorProfissional{
    listarProfissionais(criterios:any):Profissional[]
    detalharProfissional(id:string):Profissional
    registrarAvaliacao(id:string,avaliacao:any):void;
}
