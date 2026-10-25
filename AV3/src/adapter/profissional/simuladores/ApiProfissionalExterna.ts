/** Interface "estrangeira" (Adaptee) das fontes externas de profissionais: devolve registros brutos (JSON). */
export default interface ApiProfissionalExterna{
    buscarProfissionais(filtros:any):any[]
    obterPerfil(id:string):any;
    avaliarProfissional(id:string,nota:number):void;
}
