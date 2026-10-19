# Flusso completo — Progetto Classroom (Backend + Frontend)

Questo documento segue l'app dal punto di vista di chi la usa, passo dopo passo. Per ogni passo: **cosa chiede la consegna**, **come lo fa il backend**, **come si prova su Postman**, **come lo fa il frontend**.

Architettura generale: il **backend** (Express + TypeScript + MongoDB) espone delle API REST protette da JWT. Il **frontend** (Angular) chiama quelle API tramite `HttpClient`, mette il token ricevuto al login dentro `localStorage`, e lo riattacca automaticamente a ogni richiesta successiva tramite un interceptor. Non c'è nessuna sessione lato server: ogni richiesta porta con sé il token, e il server lo rilegge ogni volta per sapere chi sta chiamando.

---

## 1. Registrazione

**Consegna**: *"La pagina di registrazione è la stessa, oltre ai campi classici l'utente decide se registrarsi come docente o come studente"*.

### Backend
File: `src/api/auth/auth.dto.ts` (`RegisterDto`), `src/api/auth/auth.controller.ts` (`register`), `src/api/user/user.service.ts` (`add`).

Il body arrivato viene validato da `RegisterDto`: `username` (email), `password` (con un pattern che richiede maiuscola/minuscola/numero/simbolo), `firstName`, `lastName`, `picture`, `role` (deve essere esattamente `'student'` o `'teacher'`, validato con `@IsIn`). Il controller separa `username`/`password` (che diventano le *credenziali* di login, salvate a parte in `UserIdentity`) dal resto (che diventa il *profilo* pubblico, salvato in `User`) — sono due collezioni Mongo diverse apposta, per tenere separati "chi sei" da "come entri".

### Postman
```
POST http://localhost:3000/api/register
```
```json
{
  "username": "prof@scuola.it",
  "password": "Password1!",
  "firstName": "Anna",
  "lastName": "Bianchi",
  "picture": "https://i.pravatar.cc/150?u=prof",
  "role": "teacher"
}
```
Risposta (200): l'utente creato, con `id`, `fullName` (calcolato), senza `username`/`password`.

### Frontend
File: `pages/register/register.component.ts` + `.html`, `services/auth.service.ts` (`register()`).

Il form usa `ReactiveFormsModule` con un campo radio per `role` (`student`/`teacher` — sono le uniche stringhe accettate, devono combaciare esattamente con quello che il backend si aspetta). Al submit, `AuthService.register(...)` fa `POST /api/register`. **Non** logga automaticamente: il backend non torna un token dalla registrazione (solo dal login), quindi dopo una registrazione riuscita il componente reindirizza a `/login` — l'utente deve comunque fare login una volta creato l'account.

---

## 2. Login

**Consegna**: *"La pagina di login è comune, sia il docente che lo studente poi vanno alla lista delle classi a cui possono accedere"*.

### Backend
File: `src/api/auth/auth.controller.ts` (`login`), `src/lib/auth/local/local-strategy.ts`, `src/lib/auth/jwt/jwt-strategy.ts`.

Il login usa **Passport** con due strategie diverse in due momenti diversi:
- **local strategy**: usata *solo* durante il login, controlla `username`+`password` contro `UserIdentity` (con `bcrypt.compare` sulla password hashata)
- **jwt strategy**: usata su *tutte le altre* rotte protette, legge il token dall'header `Authorization` e recupera l'utente da lì, senza toccare più `username`/`password`

Se le credenziali sono giuste, il controller firma un token JWT (`jwt.sign(user, ...)`) che contiene dentro l'intero oggetto utente (incluso `role` — è così che il resto del backend, es. `role.middleware.ts`, sa se sei docente o studente senza dover rifare una query ogni volta).

### Postman
```
POST http://localhost:3000/api/login
```
```json
{ "username": "prof@scuola.it", "password": "Password1!" }
```
Risposta (200): `{ user, token }`.

### Frontend
File: `pages/login/login.component.ts`, `services/auth.service.ts` (`login()`), `services/jwt.service.ts`.

`AuthService.login()` fa la `POST /api/login`, e nel `pipe(...)` fa due cose in sequenza: salva il `token` in `localStorage` tramite `JwtService.setToken()`, poi aggiorna un **signal** (`_currentUser`) con l'utente ricevuto — è quel signal che la navbar e tutte le pagine leggono per sapere "chi è loggato adesso e con che ruolo". Dopo un login riuscito, il componente reindirizza a `/classrooms` (o alla pagina che l'utente stava cercando di raggiungere prima di essere rimandato al login, letta da `?dest=`).

---

## 3. Ogni pagina richiede autenticazione

**Consegna**: *"Tutte le pagine richiedono autenticazione"*.

### Backend
File: `src/lib/auth/authenticated.middleware.ts` (`isAuthenticated`).

Ogni router applica questo middleware **prima** dei suoi handler (`router.use(isAuthenticated)`), tranne `auth.router.ts` (`/register`, `/login`, le uniche rotte pubbliche). Se manca il token o non è valido, la richiesta si ferma qui con **401**, senza mai arrivare al controller.

### Frontend
File: `utils/auth.guard.ts`, `utils/auth.interceptor.ts`.

Due meccanismi complementari:
- **`authGuard`** (su `app.routes.ts`, `canActivate: [authGuard]`): impedisce di *navigare* verso una pagina protetta se non sei loggato — ti rimanda a `/login` prima ancora che il componente si carichi.
- **`authInterceptor`**: aggiunge automaticamente `Authorization: Bearer <token>` a **ogni** richiesta HTTP in uscita, così non devi mai scrivere quell'header a mano in nessun service (`classroom.service.ts`, `assignment.service.ts` ecc. non lo fanno mai esplicitamente — arriva già dall'interceptor).

Entrambi servono: il guard protegge la *navigazione* (lato Angular, esperienza utente), l'`isAuthenticated` sul backend protegge i *dati* (nessuno può bypassare il guard chiamando l'API direttamente, es. da Postman, senza token).

---

## 4. Navbar con utente loggato o pulsante di login

**Consegna**: *"L'app prevede una navbar con l'utente loggato o il pulsante di login"*.

### Frontend
File: `components/navbar/navbar.component.ts` + `.html`.

La navbar legge `authSrv.isAuthenticated()` (un signal calcolato: `computed(() => !!this.currentUser())`). Se vero, mostra nome+ruolo+bottone logout; se falso, mostra i link a login/registrazione. Non c'è bisogno di ricaricare la pagina o fare query aggiuntive: appena `AuthService` aggiorna `_currentUser` (al login, al logout, o al caricamento iniziale dell'app tramite `fetchUser()` nel costruttore), la navbar si aggiorna da sola perché Angular osserva i signal.

---

## 5. Lista classi

**Consegna**: *"Il docente vedrà le classi che ha creato. Lo studente vedrà le classi di cui fa parte"* — *"presenta una lista con il nome della classe, il nome del docente che l'ha creata e il numero di studenti"*.

### Backend
File: `src/api/classroom/classroom.service.ts` (`find`), `classroom.controller.ts` (`list`).

Qui c'è la parte concettualmente più interessante: **stessa API, comportamento diverso a seconda di chi chiama**. Il controller non decide nulla, passa semplicemente `req.user` al service; è il service che, guardando `user.role`, sceglie la query giusta:
```typescript
if (user.role === 'teacher') {
  return ClassroomModel.find({ createdBy: user.id });
} else {
  return ClassroomModel.find({ students: user.id });
}
```
Il campo `students` (array di id) non esce mai per intero nella risposta — solo `studentsCount` (un *virtual* calcolato da `students.length`), perché la consegna vuole solo il numero, non l'elenco.

### Postman
```
GET http://localhost:3000/api/classrooms
```
Header: `Authorization: Bearer <token>`

### Frontend
File: `pages/classroom-list/classroom-list.component.ts` + `.html`, `services/classroom.service.ts`.

Il componente chiama `classroomSrv.list()` una sola volta al caricamento (`ngOnInit`) — **non serve nessuna logica di ruolo nel frontend per decidere cosa mostrare**: la lista che arriva dal backend è già quella giusta per quell'utente. Il frontend deve solo occuparsi di *mostrare un bottone in più* (quello per creare una classe), che è visibile solo se `authSrv.isTeacher()`.

---

## 6. Creazione di una classe (solo docenti)

**Consegna**: *"Il docente ha a disposizione anche un pulsante di aggiunta... Per creare una classe è necessario darle un nome e selezionare gli studenti che ne fanno parte. Una volta creata non è modificabile"*.

### Backend
File: `src/lib/auth/role.middleware.ts` (`isTeacher`), `src/api/classroom/classroom.dto.ts`, `classroom.controller.ts` (`create`).

Questo è un caso di *"api a cui un tipo di utente non può accedere"*: il router applica `isTeacher` **prima** del controller (`router.post('/', isTeacher, validate(...), create)`). Se uno studente prova a chiamare questa rotta, viene bloccato con **404** (non 403 — scelta dello swagger: *"L'utente non è un docente"* → 404) ancora prima che il controller veda la richiesta. "Non è modificabile" si traduce semplicemente nel fatto che **non esiste** nessun `PUT`/`PATCH` per `Classroom` nel codice — non è una regola scritta da qualche parte, è l'assenza stessa dell'endpoint a renderlo vero.

### Postman
```
POST http://localhost:3000/api/classrooms
```
Header: `Authorization: Bearer <token_docente>`
```json
{ "name": "3A Informatica", "students": ["<id_studente1>", "<id_studente2>"] }
```

### Frontend
File: `components/create-classroom-modal/create-classroom-modal.component.ts` + `.html`, `services/user.service.ts`.

Il modal (aperto con `NgbModal`, la libreria ng-bootstrap richiesta dalla consegna) all'apertura chiama `userSrv.listStudents()` (`GET /api/users?type=student`) per popolare la lista di checkbox — deve chiedere al backend *chi sono gli studenti disponibili*, non può inventarli. Ogni checkbox aggiorna un `Set<string>` di id selezionati; al submit, quel set (convertito in array) va dentro il body della `POST /classrooms`.

---

## 7. Pagina attività di una classe

**Consegna**: *"Descrizione dell'attività, Data di creazione, Numero di studenti che l'hanno completata rispetto al totale, Un pulsante di completamento (visibile solo agli studenti se non hanno ancora completato)"* — *"Ogni utente può accedere a questa pagina solo se è il docente che ha creato la classe o se è uno studente iscritto"*.

### Backend
File: `src/api/classroom/assignment/assignment.service.ts` (`find`), `assignment.controller.ts` (`list`), `assignment.model.ts`.

Qui c'è la parte più delicata di tutto il backend. `studentsCount`/`completedCount` sono virtual calcolati dall'array `students` embedded nell'attività (uno snapshot preso al momento della creazione: `[{ studentId, completed: false }, ...]`). Ma il campo `completed` (singolare — "*io*, utente che sta chiedendo, ho completato?") **non può essere un virtual**, perché dipende da *chi* sta guardando, non solo dal documento in sé. Per questo il controller, non il model, fa:
```typescript
const obj = assignment.toObject();  // .toObject(), non .toJSON(): serve l'array "students" grezzo
if (req.user.role === 'student') {
  const status = obj.students.find(s => s.studentId.toString() === req.user.id.toString());
  obj.completed = status?.completed ?? false;
}
delete obj.students; // non va mai esposto per intero
```
L'accesso alla pagina è controllato implicitamente: se lo studente non è iscritto o il docente non è quello che ha creato la classe, le query filtrate per `classroom`/utente semplicemente non trovano nulla di suo, quindi il frontend riceve un array vuoto o un 404 a seconda del punto.

### Postman
```
GET http://localhost:3000/api/classrooms/<id_classe>/assignments
```
(prova con token docente e poi con token studente: la stessa chiamata torna dati diversi)

### Frontend
File: `pages/classroom-detail/classroom-detail.component.ts` + `.html`.

Il componente legge `classroomId` dall'URL (`route.snapshot.paramMap.get('id')`), poi chiama `assignmentSrv.list(classroomId)`. Nel template, il bottone di completamento appare solo con `@if (authSrv.isStudent() && !assignment.completed)` — di nuovo, il frontend non decide *se* mostrare i dati (arrivano già filtrati/calcolati dal backend), decide solo *quali controlli interattivi* mostrare in base al ruolo.

---

## 8. Creazione di un'attività (solo docenti)

**Consegna**: *implicita nella struttura della pagina classe — un docente deve poter aggiungere attività*.

### Backend
File: `assignment.service.ts` (`create`).

Stesso principio di `isTeacher` visto per le classi, più un controllo aggiuntivo: il service verifica che la classe esista *e* che sia stata creata da **questo** docente (`classroom.createdBy.toString() !== teacherId.toString()` → **404** se non combacia) — un docente non può aggiungere attività alla classe di un collega.

### Postman
```
POST http://localhost:3000/api/classrooms/<id_classe>/assignments
```
Header: `Authorization: Bearer <token_docente>`
```json
{ "title": "Completare esercizio 4" }
```

### Frontend
File: `components/create-assignment-modal/create-assignment-modal.component.ts` + `.html`.

Form minimo (solo `title`), riceve `classroomId` come `@Input()` passato dal componente padre (`classroom-detail`) al momento dell'apertura del modal.

---

## 9. Completamento di un'attività (solo studenti)

**Consegna**: *"Ogni studente può dichiarare di aver finito l'attività"*.

### Backend
File: `assignment.service.ts` (`complete`), `errors/already-completed.error.ts`.

`isStudent` blocca i docenti a monte. Dentro il service: cerca lo studente nell'array `students` dell'attività — se non c'è (non è iscritto a quella classe), **404**; se `completed` è già `true`, **400** `AlreadyCompleted` (non si può completare due volte la stessa attività).

### Postman
```
PATCH http://localhost:3000/api/classrooms/<id_classe>/assignments/<id_attivita>
```
Header: `Authorization: Bearer <token_studente>` (body vuoto)

### Frontend
File: `classroom-detail.component.ts` (`complete()`).

Al click, chiama `assignmentSrv.complete(...)` e poi ricarica la lista attività (`loadAssignments()`), così `completedCount` e lo stato `completed` del bottone si aggiornano subito senza bisogno di ricaricare la pagina a mano.

---

## 10. Logout

### Frontend
File: `navbar.component.ts` (`logout()`), `services/jwt.service.ts`.

`AuthService.logout()` cancella il token da `localStorage` (`JwtService.removeToken()`) e azzera il signal `_currentUser`. Non serve avvisare il backend: essendo JWT stateless, il server non "sa" che sei loggato, quindi non c'è nulla da invalidare lato server — basta che il client smetta di mandare il token.

---

## 11. Bonus — vista docente e data di completamento

**Consegna**: *"Dare la possibilità al docente, premendo sull'attività, di vedere gli studenti che hanno o non hanno completato l'attività"* — *"Registrare, oltre al completamento, anche la data di completamento"*.

### Backend
File: `assignment.entity.ts`, `assignment.model.ts`, `assignment.service.ts` (`complete`, `getStudentsStatus`), `assignment.controller.ts` (`studentsStatus`), `assignment.router.ts`.

Due aggiunte distinte:

1. **Data di completamento**: `AssignmentStudentStatus` (l'oggetto embedded dentro `students`) ha ora anche `completedAt?: Date`, valorizzato in `complete()` nello stesso momento in cui `completed` diventa `true`:
   ```typescript
   status.completed = true;
   status.completedAt = new Date();
   ```
   Nella `list()` del controller, se chi chiama è uno studente, `completedAt` viene aggiunto al suo oggetto `obj` esattamente come già si faceva per `completed` — stesso principio (dipende da *chi* guarda, non può essere un virtual).

2. **Vista docente**: nuovo endpoint `GET /classrooms/:classroomId/assignments/:id/students`, protetto da `isTeacher`. A differenza di `list()` (che nasconde sempre l'array `students` per intero), qui è proprio quell'array il contenuto della risposta — ma **popolato**: `AssignmentModel.findOne(...).populate('students.studentId')` sostituisce ogni id studente con l'oggetto `User` completo (nome, cognome, foto), così il frontend non deve fare query aggiuntive per sapere di chi si tratta. Stesso controllo di ownership già visto in `create()`: se il docente che chiama non è quello che ha creato la classe, **404**.

### Postman
```
GET http://localhost:3000/api/classrooms/<id_classe>/assignments/<id_attivita>/students
```
Header: `Authorization: Bearer <token_docente>`

Risposta: array di `{ student: {...}, completed: boolean, completedAt: string | null }`, uno per ogni studente della classe.

**Test di ruolo**: stessa chiamata con token studente → **404** (bloccato da `isTeacher`).

### Frontend
File: `components/assignment-students-modal/assignment-students-modal.component.ts` + `.html` (nuovo), `services/assignment.service.ts` (`studentsStatus`), `pages/classroom-detail/classroom-detail.component.ts` + `.html`.

Ogni riga della lista attività, nel template, è cliccabile **solo visivamente** per il docente (classe CSS `assignment-clickable`, cursore a manina), e il click apre `AssignmentStudentsModalComponent` passandogli `classroomId`/`assignmentId` come `@Input()`. Il modal chiama `assignmentSrv.studentsStatus(...)` e mostra la lista con un badge verde ("Completata il ...") o grigio ("Non completata") per ciascuno studente.

Un dettaglio del template da notare: il bottone "Segna come completata" (visibile agli studenti) sta **dentro** la stessa riga cliccabile — se non si ferma la propagazione del click, cliccare il bottone farebbe scattare *anche* `openStudentsModal(...)` per sbaglio. Per questo il bottone ha `(click)="$event.stopPropagation(); complete(assignment)"`: `stopPropagation()` impedisce che il click "salga" fino al contenitore padre e scateni il suo handler. In pratica non cambia nulla per il docente (che comunque non vede mai quel bottone, solo gli studenti), ma è buona pratica ogni volta che annidi un elemento cliccabile dentro un altro elemento cliccabile.

---

## Riepilogo — requisito → file coinvolti

| Requisito consegna | Backend | Frontend |
|---|---|---|
| Registrazione con ruolo | `auth.dto.ts`, `auth.controller.ts`, `user.service.ts` | `register.component.ts` |
| Login comune | `auth.controller.ts`, `local-strategy.ts` | `login.component.ts`, `jwt.service.ts` |
| Tutte le pagine autenticate | `authenticated.middleware.ts` | `auth.guard.ts`, `auth.interceptor.ts` |
| Navbar con utente/login | — | `navbar.component.ts` |
| Lista classi per ruolo | `classroom.service.ts` (`find`) | `classroom-list.component.ts` |
| Creazione classe (solo docenti) | `role.middleware.ts`, `classroom.controller.ts` | `create-classroom-modal.component.ts` |
| Pagina attività + accesso ristretto | `assignment.service.ts`, `assignment.model.ts` | `classroom-detail.component.ts` |
| Creazione attività (solo docenti) | `assignment.service.ts` (`create`) | `create-assignment-modal.component.ts` |
| Completamento (solo studenti) | `assignment.service.ts` (`complete`) | `classroom-detail.component.ts` (`complete()`) |
| Bonus: vista docente per studente | `assignment.service.ts` (`getStudentsStatus`), `assignment.controller.ts` | `assignment-students-modal.component.ts` |
| Bonus: data di completamento | `assignment.entity.ts`, `assignment.model.ts`, `assignment.service.ts` (`complete`) | `entities.ts`, `classroom-detail.component.html` |
