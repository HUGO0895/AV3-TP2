import Competencias from "../../Equipe/Modelo/Competencias";
import Profissional from "../../Equipe/Modelo/Profissional";
import BaseAdaptadorProfissional from "./BaseAdaptadorProfissional";
import ApiProfissionalExterna from "./simuladores/ApiProfissionalExterna";
import SimuladorLinkedin from "./simuladores/SimuladorLinkedin";

export default class AdaptadorLinkedIn extends BaseAdaptadorProfissional{
    constructor(api:ApiProfissionalExterna=new SimuladorLinkedin()){ super(api) }
    protected idDoRegistro(r:any){ return String(r.memberId) }
    protected traduzir(r:any):Profissional{
        return new Profissional(this.idDoRegistro(r),r.fullName,
            r.skills.map((s:any)=>new Competencias(s.level,s.name)),
            {inicio:new Date(r.available.from),final:new Date(r.available.to)},r.hourlyRate,[])
    }
}
