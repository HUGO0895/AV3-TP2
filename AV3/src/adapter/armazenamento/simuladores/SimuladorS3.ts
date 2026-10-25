import { ErroNegocio } from "../../../erros";
import SistemaArmazenamentoExterno from "./SistemaArmazenamentoExterno";

/** Simula a API do Amazon S3 (bucket + chave de objeto), sem rede. */
export default class SimuladorS3 implements SistemaArmazenamentoExterno{
    private objetos=new Map<string,Buffer>()
    constructor(private bucket:string="cinebridge-midia"){}
    upload(caminho:string,dados:Buffer):void{
        this.objetos.set(`s3://${this.bucket}/${caminho}`,Buffer.from(dados))
    }
    download(caminho:string):Buffer{
        const obj=this.objetos.get(`s3://${this.bucket}/${caminho}`)
        if(!obj) throw new ErroNegocio(`S3: objeto não encontrado (${caminho})`)
        return Buffer.from(obj)
    }
    listar(pasta:string):string[]{
        const base=`s3://${this.bucket}/`
        return Array.from(this.objetos.keys()).filter((k)=>k.startsWith(base+pasta)).map((k)=>k.slice(base.length)).sort()
    }
}
