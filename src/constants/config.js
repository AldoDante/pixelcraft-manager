export const CONSUMOS = {
  PRECALENTAMIENTO: { watts: 350, horas: 0.083 },
  MATERIALES: {
    "PLA/PETG": 110,
    "ABS/ASA": 190
  },
  ACE_PRO: 65
};

// Estos son valores de referencia, el costoKWh se sobreescribe con el LocalStorage
export const VALORES_DEFECTO = {
  costoKWh: 120, 
  margenGanancia: 50
};