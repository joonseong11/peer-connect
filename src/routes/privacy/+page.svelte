<script>
	import { fade } from 'svelte/transition';
</script>

<div class="mx-auto max-w-3xl px-6 py-12" in:fade={{ duration: 300 }}>
	<h1 class="mb-8 text-3xl font-bold text-slate-900">개인정보처리방침</h1>

	<div class="prose prose-slate max-w-none text-slate-600">
		<p class="mb-6">
			peer-connect(이하 ‘회사’ 또는 ‘서비스’)는 이용자의 개인정보 보호를 매우 중요하게 생각하며, 관련 법령을 준수하여 개인정보를 처리합니다. 본 개인정보처리방침은 구글 OAuth 2.0 인증을 통해 수집하는 개인정보 항목, 처리 목적, 보유 기간 및 이용자의 권리 등을 안내합니다.
		</p>

		<h2 class="mt-8 text-xl font-semibold text-slate-800">1. 수집하는 개인정보 항목</h2>
		<ul class="list-disc pl-5 space-y-1">
			<li>구글 OAuth를 통해 수집하는 정보: 이메일 주소, 이름(별명)</li>
			<li>서비스 내 프로필 작성 시 이용자가 자발적으로 입력하는 프로필 정보</li>
			<li>서비스 내 커뮤니티 활동 시 작성하는 추천서 및 게시글 내용</li>
		</ul>

		<h2 class="mt-8 text-xl font-semibold text-slate-800">2. 개인정보 수집 및 이용 목적</h2>
		<ul class="list-disc pl-5 space-y-1">
			<li>이용자 인증 및 서비스 이용을 위한 본인 확인</li>
			<li>서비스 내 프로필 관리 및 동료 프로필 조회</li>
			<li>커뮤니티 내 추천서 작성, 모임 게시판 운영 등 원활한 서비스 제공</li>
			<li>서비스 개선 및 이용자 문의 대응</li>
		</ul>

		<h2 class="mt-8 text-xl font-semibold text-slate-800">3. 개인정보 보유 및 이용 기간</h2>
		<ul class="list-disc pl-5 space-y-1">
			<li>개인정보는 수집 및 이용 목적 달성 시까지 보유하며, 이용자가 회원 탈퇴 요청 시 즉시 파기합니다.</li>
			<li>관계 법령에 의해 보존이 필요한 경우 해당 기간 동안 안전하게 보관합니다.</li>
		</ul>

		<h2 class="mt-8 text-xl font-semibold text-slate-800">4. 개인정보 파기 절차 및 방법</h2>
		<ul class="list-disc pl-5 space-y-1">
			<li>이용자의 개인정보는 목적 달성 후 별도의 보유기간 경과 시 내부 방침에 따라 안전하게 파기합니다.</li>
			<li>전자적 파일 형태는 복구 불가능한 방법으로 삭제합니다.</li>
		</ul>

		<h2 class="mt-8 text-xl font-semibold text-slate-800">5. 개인정보 제3자 제공</h2>
		<ul class="list-disc pl-5 space-y-1">
			<li>회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다.</li>
			<li>단, 법령에 따른 요구가 있거나 이용자 동의가 있는 경우 예외로 합니다.</li>
		</ul>

		<h2 class="mt-8 text-xl font-semibold text-slate-800">6. 이용자 권리 및 행사 방법</h2>
		<ul class="list-disc pl-5 space-y-1">
			<li>이용자는 언제든지 개인정보 열람, 정정, 삭제, 처리 정지를 요구할 권리가 있습니다.</li>
			<li>관련 요청은 thenetwork@peer-connect.co.kr로 문의해 주시기 바랍니다.</li>
		</ul>

		<h2 class="mt-8 text-xl font-semibold text-slate-800">7. 개인정보 보호책임자</h2>
		<ul class="list-disc pl-5 space-y-1">
			<li>이름: 전준성</li>
			<li>연락처: thenetwork@peer-connect.co.kr</li>
		</ul>

		<h2 class="mt-8 text-xl font-semibold text-slate-800">8. 안전성 확보 조치</h2>
		<ul class="list-disc pl-5 space-y-1">
			<li>수집된 개인정보는 SSL 암호화 통신을 통해 안전하게 전송됩니다.</li>
			<li>내부 관리계획 수립 및 접근 권한 제한 등 개인정보 보호를 위한 기술적, 관리적 조치를 시행합니다.</li>
		</ul>

		<h2 class="mt-8 text-xl font-semibold text-slate-800">9. 고지의 의무</h2>
		<p>본 개인정보처리방침은 변경될 수 있으며, 변경 시 이메일, 웹사이트 및 애플리케이션 공지사항 등을 통해 안내합니다.</p>
	</div>
</div>
