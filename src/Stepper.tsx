import './index.css';

export const Stepper = () => {
  return (
    <div className="stepper-container">
      <div className="stepper-track">
        
        {}
        <div className="step step-complete">
          <div className="step-circle">✓</div>
          <span className="step-label">Reserva</span>
        </div>
        <div className="step-line line-complete"></div>

        {}
        <div className="step step-complete">
          <div className="step-circle">✓</div>
          <span className="step-label">Hóspedes</span>
        </div>
        <div className="step-line line-complete"></div>

        {}
        <div className="step step-active">
          <div className="step-circle">3</div>
          <span className="step-label label-active">Responsável</span>
        </div>
        <div className="step-line"></div>

        {}
        <div className="step">
          <div className="step-circle">4</div>
          <span className="step-label">Revisão</span>
        </div>
        
      </div>
    </div>
  );
};