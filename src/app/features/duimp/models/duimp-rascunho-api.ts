export interface DuimpRascunhoApiDto {
    tipoPessoaImportador: 'F' | 'J' | null;
    documentoImportador: string | null;
    nomeImportador: string | null;
    logradouroImportador: string | null;
    numeroEnderecoImportador: string | null;
    complementoEnderecoImportador: string | null;
    bairroImportador: string | null;
    codigoMunicipioImportador: string | null;
    municipioImportador: string | null;
    ufImportador: string | null;
    cepImportador: string | null;
    paisImportador: string | null;
    informacoesComplementaresGeradas: string | null;
    informacoesComplementaresAdicionais: string | null;
    carga: CargaDuimpApiDto | null;
    itens: ItemDuimpApiDto[];
}

export interface CargaDuimpApiDto {
    tipoIdentificacaoCarga: 'CE' | 'RUC' | null;
    identificacaoCarga: string | null;
    localEmbarque: string | null;
    dataConhecimento: string | null;
    paisProcedencia: string | null;
    pesoBruto: number | null;
    pesoLiquido: number | null;
    codigoMoedaFrete: string | null;
    valorFreteMoeda: number | null;
    valorFreteReais: number | null;
    valorAfrmmTum: number | null;
    afrmmTumPago: boolean | null;
    codigoMoedaSeguro: string | null;
    valorSeguroMoeda: number | null;
    valorSeguroReais: number | null;
    unidadesDespacho: string[];
    componentesFrete: ComponenteFreteDuimpApiDto[];
    embalagens: EmbalagemDuimpApiDto[];
}

export interface ComponenteFreteDuimpApiDto {
    pagamento: string | null;
    tipo: string | null;
    moeda: string | null;
    valorMoeda: number | null;
}

export interface EmbalagemDuimpApiDto {
    item: string | null;
    tipo: string | null;
    quantidade: number | null;
}

export interface ItemDuimpApiDto {
    numeroItem: number;
    numeroAdicao: number | null;
    caracterizacaoImportacao: string | null;
    nomeProduto: string | null;
    versaoProduto: string | null;
    ncm: string | null;
    paisOrigem: string | null;
    codigoFabricante: string | null;
    nomeFabricante: string | null;
    versaoFabricante: string | null;
    enderecoFabricante: string | null;
    exportadorEhFabricante: boolean | null;
    paisExportador: string | null;
    codigoExportador: string | null;
    nomeExportador: string | null;
    versaoExportador: string | null;
    enderecoExportador: string | null;
    ufConsumo: string | null;
    codigoMunicipioConsumo: string | null;
    municipioConsumo: string | null;
    aplicacao: string | null;
    condicaoMercadoria: string | null;
    unidadeMedidaEstatistica: string | null;
    quantidadeMedidaEstatistica: number | null;
    pesoLiquido: number | null;
    unidadeComercializada: string | null;
    quantidadeUnidadeComercializada: number | null;
    moedaNegociada: string | null;
    valorUnitarioCondicaoVenda: number | null;
    numeroSerie: string | null;
    detalhamentoProduto: string | null;
    metodoValoracao: string | null;
    incoterm: string | null;
    coberturaCambial: string | null;
}