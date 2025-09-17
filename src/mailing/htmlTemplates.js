const reminderHtml= (nome_completo) => {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>PONTIFÍCIO COLÉGIO PIO BRASILEIRO</title>
        </head>
        <body style="font-family: 'Inter', sans-serif; margin: 0; padding: 0; background-color: #f0f0f0;">

            <center>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                        <td align="center" style="padding: 20px 0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 700px; border-radius: 16px; background-color: #f0f0f0;">

                                <tr>
                                    <td style="padding: 16px; text-align: center;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                                            <tr>
                                                <td valign="middle" style="padding-right: 16px;">
                                                    <img src="https://www.piobrasileiro.com/wp-content/uploads/2025/05/cropped-brasao-sem-fundo.png" width="50" alt="Logo colégio pio" style="display: block;">
                                                    
                                                </td>
                                                <td valign="middle">
                                                    <span style="font-family: 'Inter', sans-serif; font-weight: 400; font-size: 16px; color: #000000; white-space: nowrap;">PONTIFÍCIO COLÉGIO PIO BRASILEIRO</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <tr>
                                    <td align="center" style="padding: 20px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fff; border-radius: 16px; padding: 48px; max-width: 650px;">
                                            
                                            <tr>
                                                <td align="center">
                                                    <h2 style="font-family: 'Inter', sans-serif; font-weight: 400; font-size: 24px; margin: 0 0 32px 0;">Olá, ${nome_completo.split(' ')[0]}!</h2>
                                                    <div style="background-color: #EAFCE9; padding: 16px; border-radius: 50%; width: 34px; height: 34px; margin: 0 auto; display: block;">
                                                        <img src="https://bucket.mailersendapp.com/z3m5jgr8emldpyo6/vz9dlemqe8q4kj50/images/9fe6559e-6f42-43d4-b301-8a3680f1143a.png" width="34" height="34" alt="Alarm Clock Icon" style="display: block;">
                                                    </div>
                                                </td>
                                            </tr>
                                            
                                            <tr>
                                                <td style="padding-top: 24px; text-align: center;">
                                                    <p style="font-family: 'Inter', sans-serif; font-weight: 400; line-height: 1.5; font-size: 16px; margin: 0 0 24px 0;">Lembramos que o agendamento das refeições da semana deve ser feito até às 19 horas de hoje.</p>
                                                    <p style="font-family: 'Inter', sans-serif; font-weight: 400; line-height: 1.5; font-size: 16px; margin: 0 0 24px 0;">Essa organização nos ajuda a preparar a quantidade correta de alimentos, evitando desperdícios e garantindo a refeição de todos!</p>
                                                </td>
                                            </tr>

                                            <tr>
                                                <td style="padding: 0 0 32px 0; border-bottom: 2px solid #F1F5F9;">
                                                    <p style="text-align: left; font-family: 'Inter', sans-serif; font-weight: 400; margin: 0;">
                                                        <a href="https://www.piobrasileiroapp.com" style="color: #267024; font-size: 16px; text-decoration: none; font-weight: 400;">Acessar plataforma</a>
                                                    </p>
                                                </td>
                                            </tr>
                                            
                                            <tr>
                                                <td style="padding-top: 24px;">
                                                    <p style="font-family: 'Inter', sans-serif; font-weight: 400; line-height: 1.5; font-size: 16px; margin: 0 0 8px 0;">Agradecemos pela colaboração e compreensão.</p>
                                                    <p style="font-family: 'Inter', sans-serif; font-weight: 400; line-height: 1.5; font-size: 16px; margin: 0;">Atenciosamente<br><strong style="font-weight: 700;">Pontifício Colégio Pio Brasileiro</strong></p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </center>
        </body>
        </html>
    `; 
}

const confirmationHtml = (nome_completo, monday, mealsInfo) => {

    const formattedDays = [];
    for (let i = 0; i < 7; i++) {
        const currentDay = new Date(monday);
        currentDay.setDate(monday.getDate() + i);
        const dayStr = currentDay.toISOString().split('T')[0];

        formattedDays.push({
            date: dayStr,
            dayName: currentDay.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' - ' + (currentDay.toLocaleDateString('pt-BR', { weekday: 'long' }).charAt(0).toUpperCase() + currentDay.toLocaleDateString('pt-BR', { weekday: 'long' }).slice(1))
        });
    }

    const formattedDaysWithMeals = formattedDays.map(day => {
        const mealData = mealsInfo.find(meal => meal.data.toISOString().split('T')[0] === day.date);

        if (!mealData) {
            return {
                date: day.date,
                dayName: day.dayName,
                almoco: 'X',
                janta: 'X'
            }
        }

        return {
            date: day.date,
            dayName: day.dayName,
            almoco: mealData.almoco_colegio ? (mealData.almoco_levar ? 'Para levar' : 'No Colégio Pio') : 'X',
            janta: mealData.janta_colegio ? 'No Colégio Pio' : 'X'
        }
    })

    const formattedHtmlMeals = formattedDaysWithMeals.map(meal => {
        return `
            <tr>
                <td style="font-family: 'Inter', sans-serif; font-weight: 400; font-size: 14px; padding: 12px; text-align: center; border-bottom: 1px solid #e2e8f0;">${meal.dayName}</td>
                <td style="font-family: 'Inter', sans-serif; font-weight: 400; font-size: 14px; padding: 12px; text-align: center; border-bottom: 1px solid #e2e8f0;">${meal.almoco}</td>
                <td style="font-family: 'Inter', sans-serif; font-weight: 400; font-size: 14px; padding: 12px; text-align: center; border-bottom: 1px solid #e2e8f0;">${meal.janta}</td>
            </tr>
        `
    }).join('');

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>PONTIFÍCIO COLÉGIO PIO BRASILEIRO</title>
        </head>
        <body style="font-family: 'Inter', sans-serif; margin: 0; padding: 0; background-color: #f0f0f0;">

            <center>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                        <td align="center" style="padding: 20px 0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 700px; border-radius: 16px; background-color: #f0f0f0;">

                                <tr>
                                    <td style="padding: 16px; text-align: center;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                                            <tr>
                                                <td valign="middle" style="padding-right: 16px;">
                                                    <img src="https://www.piobrasileiro.com/wp-content/uploads/2025/05/cropped-brasao-sem-fundo.png" width="50" alt="Logo colégio pio" style="display: block;">
                                                </td>
                                                <td valign="middle">
                                                    <span style="font-family: 'Inter', sans-serif; font-weight: 400; font-size: 16px; color: #000000; white-space: nowrap;">PONTIFÍCIO COLÉGIO PIO BRASILEIRO</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <tr>
                                    <td align="center" style="padding: 20px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fff; border-radius: 16px; padding: 48px; max-width: 650px;">
                                            
                                            <tr>
                                                <td align="center">
                                                    <h2 style="font-family: 'Inter', sans-serif; font-weight: 400; font-size: 24px; margin: 0 0 32px 0;">Olá, ${nome_completo.split(' ')[0]}!</h2>
                                                    <div style="background-color: #EAFCE9; padding: 16px; border-radius: 50%; width: 34px; height: 34px; margin: 0 auto; display: block;">
                                                        <img src="https://bucket.mailersendapp.com/z3m5jgr8emldpyo6/vz9dlemqe8q4kj50/images/9fe6559f-2a52-43fc-8a75-2ee95b2a7a9a.png" width="34" height="34" alt="Check Icon" style="display: block;">
                                                    </div>
                                                </td>
                                            </tr>
                                            
                                            <tr>
                                                <td style="padding-top: 24px; text-align: center;">
                                                    <p style="font-family: 'Inter', sans-serif; font-weight: 400; line-height: 1.5; font-size: 16px; margin: 0 0 24px 0;">Seu agendamento de refeições para esta semana foi registrado com sucesso.</p>
                                                    <p style="font-family: 'Inter', sans-serif; font-weight: 400; line-height: 1.5; font-size: 16px; margin: 0 0 24px 0;">Segue abaixo o resumo para sua conferência:</p>
                                                </td>
                                            </tr>
                                            
                                            <tr>
                                                <td style="padding-bottom: 24px; text-align: center;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse; border-spacing: 0;">
                                                        <tr style="background-color: #f1f5f9;">
                                                            <td style="font-family: 'Inter', sans-serif; font-weight: 700; font-size: 14px; padding: 12px; text-align: center;">Dia da semana</td>
                                                            <td style="font-family: 'Inter', sans-serif; font-weight: 700; font-size: 14px; padding: 12px; text-align: center;">Almoço</td>
                                                            <td style="font-family: 'Inter', sans-serif; font-weight: 700; font-size: 14px; padding: 12px; text-align: center;">Janta</td>
                                                        </tr>
                                                        
                                                        ${formattedHtmlMeals}
                                                    </table>
                                                </td>
                                            </tr>

                                            <tr>
                                                <td>
                                                    <p style="font-family: 'Inter', sans-serif; font-weight: 400; line-height: 1.5; font-size: 16px; margin: 0 0 24px 0;">Caso precise alterar algum dia ou refeição, acesse o sistema antes do prazo limite para ajustes.</p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding-top: 24px;">
                                                    <p style="font-family: 'Inter', sans-serif; font-weight: 400; line-height: 1.5; font-size: 16px; margin: 0 0 8px 0;">Agradecemos pela colaboração e compreensão.</p>
                                                    <p style="font-family: 'Inter', sans-serif; font-weight: 400; line-height: 1.5; font-size: 16px; margin: 0;">Atenciosamente<br><strong style="font-weight: 700;">Pontifício Colégio Pio Brasileiro</strong></p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </center>
        </body>
        </html>
    `
}

const resetPasswordHtml = (nome_completo, resetLink) => {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>PONTIFÍCIO COLÉGIO PIO BRASILEIRO</title>
        </head>
        <body style="font-family: 'Inter', sans-serif; margin: 0; padding: 0; background-color: #f0f0f0;">

            <center>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                        <td align="center" style="padding: 20px 0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 700px; border-radius: 16px; background-color: #f0f0f0;">

                                <tr>
                                    <td style="padding: 16px; text-align: center;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                                            <tr>
                                                <td valign="middle" style="padding-right: 16px;">
                                                    <img src="https://www.piobrasileiro.com/wp-content/uploads/2025/05/cropped-brasao-sem-fundo.png" width="50" alt="Logo colégio pio" style="display: block;">
                                                </td>
                                                <td valign="middle">
                                                    <span style="font-family: 'Inter', sans-serif; font-weight: 400; font-size: 16px; color: #000000; white-space: nowrap;">PONTIFÍCIO COLÉGIO PIO BRASILEIRO</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <tr>
                                    <td align="center" style="padding: 20px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fff; border-radius: 16px; padding: 48px; max-width: 650px;">
                                            
                                            <tr>
                                                <td align="center">
                                                    <h2 style="font-family: 'Inter', sans-serif; font-weight: 400; font-size: 24px; margin: 0 0 32px 0;">Olá, ${nome_completo.split(' ')[0]}!</h2>
                                                    <div style="background-color: #EAFCE9; padding: 16px; border-radius: 50%; width: 34px; height: 34px; margin: 0 auto; display: block;">
                                                        <img src="https://bucket.mailersendapp.com/z3m5jgr8emldpyo6/vz9dlemqe8q4kj50/images/9fe6559f-f00b-48fa-8f41-e1b0b61c601c.png" width="34" height="34" alt="Icon" style="display: block;">
                                                    </div>
                                                </td>
                                            </tr>
                                            
                                            <tr>
                                                <td style="padding-top: 24px; text-align: center;">
                                                    <p style="font-family: 'Inter', sans-serif; font-weight: 400; line-height: 1.5; font-size: 16px; margin: 0 0 24px 0;">Clique no botão abaixo para alterar sua senha:</p>
                                                </td>
                                            </tr>

                                            <tr>
                                                <td style="padding: 0 0 32px 0; border-bottom: 2px solid #F1F5F9;">
                                                    <p style="text-align: left; font-family: 'Inter', sans-serif; font-weight: 400; margin: 0;">
                                                        <a href="${resetLink}" style="color: #267024; font-size: 16px; text-decoration: none; font-weight: 400;">Link para alterar senha: ${resetLink}</a>
                                                    </p>
                                                </td>
                                            </tr>
                                            
                                            <tr>
                                                <td style="padding-top: 24px;">
                                                    <p style="font-family: 'Inter', sans-serif; font-weight: 400; line-height: 1.5; font-size: 16px; margin: 0;">Atenciosamente<br><strong style="font-weight: 700;">Pontifício Colégio Pio Brasileiro</strong></p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </center>
        </body>
        </html>
    `
}

export  { reminderHtml, confirmationHtml, resetPasswordHtml }