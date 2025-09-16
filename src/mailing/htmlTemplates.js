const reminderHtml= (nome_completo) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            * {
                font-family: 'Inter', sans-serif;
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-weight: 400;
            }

            .container {
                display: flex;
                justify-content: center;
                align-items: center;
                flex-direction: column;
                background-color: #f0f0f0;
                margin-left: auto;
                margin-right: auto;
                width: 100%;
                max-width: 700px;
                border-radius: 1rem;
            }

            .box-header {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 2rem;
            }

            .box-intro {
                display: flex;
                align-items: center;
                flex-direction: column;
                gap: 2rem;
                margin-bottom: 2rem;
            }

            .icon {
                background-color: #EAFCE9;
                padding: 1rem;
                border-radius: 100%;
                display: flex;
                align-items: center;
            }

            .box {
                display: flex;
                flex-direction: column;
                align-items: center;
                margin: 1.25rem;
                background-color: #fff;
                border-radius: 1rem;
                padding: 4rem;
            }

            .box-content {
                display: flex;
                flex-direction: column;
                gap: 1rem;
                font-weight: 400;
                line-height: 1.5;
            }

            .platform-link {
                text-align: left;
                color: #267024;
                padding-bottom: 2rem;
                border-bottom: 2px solid #F1F5F9;
            }
        </style>
    </head>
    <body>
        <div class="container">

            <div class="box-header">
                <img src="https://www.piobrasileiro.com/wp-content/uploads/2025/05/cropped-brasao-sem-fundo.png" width="50" alt="Logo colégio pio">
                <span>PONTIFÍCIO COLÉGIO PIO BRASILEIRO</span>
            </div>

            <div class="box">

                <div class="box-intro">
                    <h2>Olá, ${nome_completo.split(' ')[0]}</h2>
                    <div class="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#267024" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alarm-clock-icon lucide-alarm-clock"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3 2 6"/><path d="m22 6-3-3"/><path d="M6.38 18.7 4 21"/><path d="M17.64 18.67 20 21"/></svg>
                    </div>
                    </div>

                <div class="box-content">
                    <p>Lembramos que o agendamento das refeições da semana deve ser feito até às 19 horas de hoje.</p>
                    <p>Essa organização nos ajuda a preparar a quantidade correta de alimentos, evitando desperdícios e garantido a refeição de todos!</p>

                    <a class="platform-link" href="https://www.piobrasileiroapp.com">Acessar plataforma</a>

                    <p>Agradecemos pela colaboração e compreensão.</p>
                    <p>Atenciosamente<br><strong>Pontifício Colégio Pio Brasileiro</strong></p>
                    
                </div>

            </div>
        </div>
    </body>
    </html>
    `
}

const confirmationHtml = (nome_completo, monday, mealsInfo) => {

    const formattedDays = [];
    for (let i = 0; i < 7; i++) {
        const currentDay = new Date(monday);
        currentDay.setDate(monday.getDate() + i);
        const dayStr = currentDay.toISOString().split('T')[0];

        formattedDays.push({
            date: dayStr,
            dayName: currentDay.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' - ' + currentDay.toLocaleDateString('pt-BR', { weekday: 'long' })
        });
    }

    const formattedMeals = formattedDays.map(day => {
        const mealData = mealsInfo.find(meal => meal.data.toISOString().split('T')[0] === day.date);

        console.log('mealData:', mealData);

        return {
            date: day.date,
            dayName: day.dayName,
            almoco: mealData.almoco_colegio ? (mealData.almoco_levar ? 'Para levar' : 'No Colégio Pio') : 'X',
            janta: mealData.janta_colegio ? 'No Colégio Pio' : 'X'
        }
    })

    console.log('formattedMeals:', formattedMeals);


    return `
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Document</title>
        </head>

        <style>
            * {
                font-family: 'Inter', sans-serif;
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-weight: 400;
            }

            .container {
                display: flex;
                justify-content: center;
                align-items: center;
                flex-direction: column;
                background-color: #f0f0f0;
                margin-left: auto;
                margin-right: auto;
                width: 100%;
                max-width: 700px;
                border-radius: 1rem;
            }

            .box-header {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 1rem;
            }

            .box-intro {
                display: flex;
                align-items: center;
                flex-direction: column;
                gap: 2rem;
                margin-bottom: 2rem;
            }

            .icon {
                background-color: #EAFCE9;
                padding: 1rem;
                border-radius: 100%;
                display: flex;
                align-items: center;
            }

            .box {
                display: flex;
                flex-direction: column;
                align-items: center;
                margin: 1.25rem;
                background-color: #fff;
                border-radius: 1rem;
                padding: 3rem;
            }

            .box-content {
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
                font-weight: 400;
                line-height: 1.5;
            }

            .platform-link {
                border-bottom: 2px solid #F1F5F9;
            }

            .table {
                width: 100%;
                border-collapse: collapse;
                border: 2px solid #E2E8F0;
                border-radius: .5rem;
            }

            .table-header {
                display: flex;
                align-items: center;
                padding: .2rem;
                background-color: #f8f9fa;
                border-bottom: 1px solid #E2E8F0;
            }

            .table-header span {
                font-weight: 500;
                flex: 1;
                text-align: center;
                padding: 0.5rem;
            }

            .table-row {
                display: flex;
                align-items: center;
                padding: .2rem;
                border-bottom: 1px solid #E2E8F0;
            }

            .table-row:last-child {
                border-bottom: none;
            }

            .table-row span {
                flex: 1;
                text-align: center;
                padding: 0.25rem;
            }
        </style>

        <body>
            <div class="container">

                <div class="box-header">
                    <img src="https://www.piobrasileiro.com/wp-content/uploads/2025/05/cropped-brasao-sem-fundo.png" width="50" alt="Logo colégio pio">
                    <span>PONTIFÍCIO COLÉGIO PIO BRASILEIRO</span>
                </div>

                <div class="box">

                    <div class="box-intro">
                        <h2>Olá, ${nome_completo.split(' ')[0]}!</h2>
                        <div class="icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#267024" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-icon lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
                            </div>
                        </div>

                    <div class="box-content">
                        <p>Seu agendamento de refeições para esta semana foi registrado com sucesso.</p>
                        <p>Segue abaixo o resumo para sua conferência:</p>

                        <div class="table">
                            <div class="table-header">
                                <span>Dia da semana</span>
                                <span>Almoço</span>
                                <span>Janta</span>
                            </div>
                            
                            <div class="table-row">
                                <span>28/07 - Segunda-feira</span>
                                <span>No Colégio Pio</span>
                                <span>No Colégio Pio</span>
                            </div>
                            
                            <div class="table-row">
                                <span>29/07 - Terça-feira</span>
                                <span>X</span>
                                <span>No Colégio Pio</span>
                            </div>
                            
                            <div class="table-row">
                                <span>30/07 - Quarta-feira</span>
                                <span>Para levar</span>
                                <span>X</span>
                            </div>
                            
                            <div class="table-row">
                                <span>31/07 - Quinta-feira</span>
                                <span>X</span>
                                <span>X</span>
                            </div>
                            
                            <div class="table-row">
                                <span>01/08 - Sexta-feira</span>
                                <span>No Colégio Pio</span>
                                <span>No Colégio Pio</span>
                            </div>
                            
                            <div class="table-row">
                                <span>02/08 - Sábado</span>
                                <span>No Colégio Pio</span>
                                <span>No Colégio Pio</span>
                            </div>
                            
                            <div class="table-row">
                                <span>03/08 - Domingo</span>
                                <span>No Colégio Pio</span>
                                <span>No Colégio Pio</span>
                            </div>
                            
                        </div>

                        <p>Caso precise alterar algum dia ou refeição, acesse o sistema antes do prazo limite para ajustes.</p>

                        <a class="platform-link"></a>

                        <p>Agradecemos pela colaboração e compreensão.</p>
                        <p>Atenciosamente<br><strong>Pontifício Colégio Pio Brasileiro</strong></p>
                        
                    </div>

                </div>
            </div>
        </body>
    </html>
    `
}

const resetPasswordHtml = (nome_completo, reset_token) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Document</title>
        </head>

        <style>
            * {
                font-family: 'Inter', sans-serif;
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-weight: 400;
            }

            .container {
                display: flex;
                justify-content: center;
                align-items: center;
                flex-direction: column;
                background-color: #f0f0f0;
                margin-left: auto;
                margin-right: auto;
                width: 100%;
                max-width: 700px;
                border-radius: 1rem;
            }

            .box-header {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 1rem;
            }

            .box-intro {
                display: flex;
                align-items: center;
                flex-direction: column;
                gap: 2rem;
                margin-bottom: 2rem;
            }

            .icon {
                background-color: #EAFCE9;
                padding: 1rem;
                border-radius: 100%;
                display: flex;
                align-items: center;
            }

            .box {
                display: flex;
                flex-direction: column;
                align-items: center;
                margin: 1.25rem;
                background-color: #fff;
                border-radius: 1rem;
                padding: 3rem;
            }

            .box-content {
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
                font-weight: 400;
                line-height: 1.5;
            }

            .platform-link {
                text-align: left;
                color: #267024;
                padding-bottom: 2rem;
                border-bottom: 2px solid #F1F5F9;
            }
        </style>

        <body>
            <div class="container">

                <div class="box-header">
                    <img src="https://www.piobrasileiro.com/wp-content/uploads/2025/05/cropped-brasao-sem-fundo.png" width="50" alt="Logo colégio pio">
                    <span>PONTIFÍCIO COLÉGIO PIO BRASILEIRO</span>
                </div>

                <div class="box">

                    <div class="box-intro">
                        <h2>Olá, ${nome_completo.split(' ')[0]}!</h2>
                        <div class="icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#267024" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-key-round-icon lucide-key-round"><path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/></svg>
                        </div>
                        </div>

                    <div class="box-content">
                        <p>Clique no botão abaixo para alterar sua senha:</p>

                        <a class="platform-link" href="https://www.piobrasileiroapp.com/reset-password?token=${reset_token}">Alterar senha</a>

                        <p>Atenciosamente<br><strong>Pontifício Colégio Pio Brasileiro</strong></p>
                        
                    </div>
                </div>
            </div>
        </body>
    </html>
    `
}

export  { reminderHtml, confirmationHtml, resetPasswordHtml }