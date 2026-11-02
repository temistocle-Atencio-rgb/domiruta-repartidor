import React, { useState } from 'react';
import { MapPin, AlertCircle, RefreshCw } from 'lucide-react';

interface PantallaPermisoGpsProps {
  bloqueado: boolean;
  onSolicitarGps: () => void;
  onRevisarPermiso: () => void;
}

export const PantallaPermisoGps: React.FC<PantallaPermisoGpsProps> = ({
  bloqueado,
  onSolicitarGps,
  onRevisarPermiso,
}) => {
  const [tabPlataforma, setTabPlataforma] = useState<'android' | 'ios'>('android');

  return (
    <main className="min-h-screen bg-[#F2F4F7] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm bg-white rounded-[5px] border border-[#E3E7EC] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-5 text-center space-y-4">
        {/* Ícono de GPS */}
        <div className="w-14 h-14 rounded-full bg-[#003A73]/10 text-[#003A73] flex items-center justify-center mx-auto">
          <MapPin className="w-7 h-7 text-[#005198]" strokeWidth={2.2} />
        </div>

        <div>
          <h1 className="font-poppins font-bold text-[19px] text-[#003A73] m-0 leading-tight">
            Ubicación obligatoria
          </h1>
          <p className="font-inter text-[14px] text-[#5B6670] mt-2 mb-0 leading-relaxed font-normal">
            Para llevar esta salida, activa tu ubicación. La tienda y el cliente ven por dónde vas mientras entregas.
          </p>
        </div>

        {!bloqueado ? (
          /* Estado inicial: antes de pedir el permiso */
          <div className="pt-2 space-y-3">
            <button
              type="button"
              onClick={onSolicitarGps}
              className="w-full h-[48px] bg-[#F28C1B] hover:bg-[#e07f15] active:bg-[#cc710e] text-[#1F2933] rounded-[5px] font-poppins font-semibold text-[15px] flex items-center justify-center transition-colors shadow-sm cursor-pointer select-none"
            >
              Activar ubicación
            </button>
            <p className="font-inter text-xs text-[#5B6670] m-0">
              Toca "Permitir" cuando el navegador te pregunte.
            </p>
          </div>
        ) : (
          /* Estado bloqueado / denegado: Instrucciones paso a paso */
          <div className="pt-1 text-left space-y-3">
            <div className="bg-[#B03030]/10 border-l-4 border-[#B03030] p-2.5 rounded-[5px] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-[#B03030] flex-shrink-0 mt-0.5" />
              <p className="font-inter text-[13px] text-[#B03030] font-medium leading-tight m-0">
                El acceso a la ubicación está desactivado en tu navegador.
              </p>
            </div>

            <div className="flex rounded-[5px] border border-[#E3E7EC] overflow-hidden">
              <button
                type="button"
                onClick={() => setTabPlataforma('android')}
                className={`flex-1 py-2 text-center font-poppins font-semibold text-xs cursor-pointer transition-colors ${
                  tabPlataforma === 'android'
                    ? 'bg-[#003A73] text-white'
                    : 'bg-white text-[#5B6670] hover:bg-[#F2F4F7]'
                }`}
              >
                Android (Chrome)
              </button>
              <button
                type="button"
                onClick={() => setTabPlataforma('ios')}
                className={`flex-1 py-2 text-center font-poppins font-semibold text-xs cursor-pointer transition-colors ${
                  tabPlataforma === 'ios'
                    ? 'bg-[#003A73] text-white'
                    : 'bg-white text-[#5B6670] hover:bg-[#F2F4F7]'
                }`}
              >
                iPhone (Safari)
              </button>
            </div>

            {tabPlataforma === 'android' ? (
              <p className="font-inter text-[13.5px] text-[#1F2933] bg-[#F2F4F7] p-3 rounded-[5px] m-0 leading-relaxed">
                Toca el candado o el ícono de ajustes a la izquierda de la dirección › <strong>Permisos</strong> › <strong>Ubicación</strong> › <strong>Permitir</strong>. Luego recarga la página.
              </p>
            ) : (
              <p className="font-inter text-[13.5px] text-[#1F2933] bg-[#F2F4F7] p-3 rounded-[5px] m-0 leading-relaxed">
                Ajustes del celular › <strong>Safari</strong> › <strong>Ubicación</strong> › <strong>Preguntar</strong> o <strong>Permitir</strong>. Luego vuelve y recarga la página.
              </p>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={onRevisarPermiso}
                className="w-full h-[48px] bg-[#005198] hover:bg-[#003A73] text-white rounded-[5px] font-poppins font-semibold text-[14px] flex items-center justify-center gap-2 transition-colors cursor-pointer select-none"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Ya la activé, verificar</span>
              </button>
              <p className="font-inter text-[11px] text-[#5B6670] text-center mt-2 mb-0">
                La página revisa automáticamente cada 3 segundos.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
